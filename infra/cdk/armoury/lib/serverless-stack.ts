import * as path from "path";
import * as cdk from "aws-cdk-lib";
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as s3 from "aws-cdk-lib/aws-s3";
import * as s3deploy from "aws-cdk-lib/aws-s3-deployment";
import * as cloudfront from "aws-cdk-lib/aws-cloudfront";
import * as origins from "aws-cdk-lib/aws-cloudfront-origins";
import * as iam from "aws-cdk-lib/aws-iam";
import { Construct } from "constructs";

export interface ServerlessStackProps extends cdk.StackProps {
  databaseUrlParameterName?: string;
}

const APP_ROOT = path.resolve(__dirname, "..", "..", "..", "..", "apps", "web");
const OPENNEXT_DIR = path.join(APP_ROOT, ".open-next");

export class ServerlessStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: ServerlessStackProps) {
    super(scope, id, props);

    const assetsBucket = new s3.Bucket(this, "AssetsBucket", {
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      encryption: s3.BucketEncryption.S3_MANAGED,
      enforceSSL: true,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      autoDeleteObjects: true,
    });

    new s3deploy.BucketDeployment(this, "AssetsDeployment", {
      sources: [s3deploy.Source.asset(path.join(OPENNEXT_DIR, "assets"))],
      destinationBucket: assetsBucket,
      prune: true,
    });

    const serverFunction = new lambda.Function(this, "ServerFunction", {
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: "index.handler",
      code: lambda.Code.fromAsset(path.join(OPENNEXT_DIR, "server-functions", "default")),
      memorySize: 1024,
      timeout: cdk.Duration.seconds(30),
      architecture: lambda.Architecture.ARM_64,
      environment: {
        NODE_ENV: "production",
        AUTH_TRUST_HOST: "true",
        AUTH_URL: process.env.AUTH_URL ?? "",
        DATABASE_URL: process.env.DATABASE_URL ?? "",
        AUTH_SECRET: process.env.AUTH_SECRET ?? "",
      },
      logRetention: 14,
    });

    const serverFunctionUrl = serverFunction.addFunctionUrl({
      authType: lambda.FunctionUrlAuthType.NONE,
      invokeMode: lambda.InvokeMode.RESPONSE_STREAM,
    });

    const imageFunction = new lambda.Function(this, "ImageFunction", {
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: "index.handler",
      code: lambda.Code.fromAsset(path.join(OPENNEXT_DIR, "image-optimization-function")),
      memorySize: 1024,
      timeout: cdk.Duration.seconds(15),
      architecture: lambda.Architecture.ARM_64,
      environment: {
        BUCKET_NAME: assetsBucket.bucketName,
        BUCKET_KEY_PREFIX: "",
      },
      logRetention: 14,
    });

    assetsBucket.grantRead(imageFunction);

    const imageFunctionUrl = imageFunction.addFunctionUrl({
      authType: lambda.FunctionUrlAuthType.NONE,
    });

    const cacheDisabled = cloudfront.CachePolicy.CACHING_DISABLED;
    const cacheStatic = cloudfront.CachePolicy.CACHING_OPTIMIZED;
    const requestForwardAll = cloudfront.OriginRequestPolicy.ALL_VIEWER_EXCEPT_HOST_HEADER;

    const serverOrigin = new origins.FunctionUrlOrigin(serverFunctionUrl, {
      readTimeout: cdk.Duration.seconds(30),
    });

    const imageOrigin = new origins.FunctionUrlOrigin(imageFunctionUrl);
    const assetsOrigin = origins.S3BucketOrigin.withOriginAccessControl(assetsBucket);

    const distribution = new cloudfront.Distribution(this, "Distribution", {
      defaultBehavior: {
        origin: serverOrigin,
        viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
        allowedMethods: cloudfront.AllowedMethods.ALLOW_ALL,
        cachePolicy: cacheDisabled,
        originRequestPolicy: requestForwardAll,
        responseHeadersPolicy: cloudfront.ResponseHeadersPolicy.SECURITY_HEADERS,
      },
      additionalBehaviors: {
        "/_next/static/*": {
          origin: assetsOrigin,
          viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
          cachePolicy: cacheStatic,
        },
        "/_next/image*": {
          origin: imageOrigin,
          viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
          cachePolicy: cacheStatic,
          originRequestPolicy: requestForwardAll,
        },
        "/favicon.ico": {
          origin: assetsOrigin,
          viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
          cachePolicy: cacheStatic,
        },
      },
      priceClass: cloudfront.PriceClass.PRICE_CLASS_200,
      httpVersion: cloudfront.HttpVersion.HTTP2_AND_3,
      minimumProtocolVersion: cloudfront.SecurityPolicyProtocol.TLS_V1_2_2021,
    });

    serverFunction.addToRolePolicy(
      new iam.PolicyStatement({
        actions: ["s3:GetObject", "s3:PutObject", "s3:ListBucket", "s3:DeleteObject"],
        resources: [assetsBucket.bucketArn, `${assetsBucket.bucketArn}/*`],
      }),
    );

    new cdk.CfnOutput(this, "DistributionUrl", {
      value: `https://${distribution.distributionDomainName}`,
      description: "Public URL of the Armoury app",
    });

    new cdk.CfnOutput(this, "DistributionId", {
      value: distribution.distributionId,
    });

    new cdk.CfnOutput(this, "AssetsBucketName", {
      value: assetsBucket.bucketName,
    });
  }
}
