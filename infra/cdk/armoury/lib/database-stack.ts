import * as cdk from "aws-cdk-lib";
import * as ec2 from "aws-cdk-lib/aws-ec2";
import * as rds from "aws-cdk-lib/aws-rds";
import * as ssm from "aws-cdk-lib/aws-ssm";
import * as secretsmanager from "aws-cdk-lib/aws-secretsmanager";
import { Construct } from "constructs";

export class DatabaseStack extends cdk.Stack {
  public readonly vpc: ec2.IVpc;
  public readonly secret: secretsmanager.ISecret;
  public readonly securityGroup: ec2.ISecurityGroup;

  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const vpcId = ssm.StringParameter.valueFromLookup(this, "/platform/network/vpc-id");
    this.vpc = ec2.Vpc.fromLookup(this, "Vpc", { vpcId });

    this.securityGroup = new ec2.SecurityGroup(this, "DbSecurityGroup", {
      vpc: this.vpc,
      description: "Armoury RDS access",
      allowAllOutbound: false,
    });

    const cluster = new rds.DatabaseInstance(this, "Postgres", {
      engine: rds.DatabaseInstanceEngine.postgres({
        version: rds.PostgresEngineVersion.VER_16,
      }),
      instanceType: ec2.InstanceType.of(ec2.InstanceClass.T4G, ec2.InstanceSize.MICRO),
      vpc: this.vpc,
      vpcSubnets: { subnetType: ec2.SubnetType.PRIVATE_ISOLATED },
      securityGroups: [this.securityGroup],
      databaseName: "armoury",
      credentials: rds.Credentials.fromGeneratedSecret("armoury"),
      allocatedStorage: 20,
      storageEncrypted: true,
      backupRetention: cdk.Duration.days(7),
      deletionProtection: false,
      removalPolicy: cdk.RemovalPolicy.SNAPSHOT,
      multiAz: false,
      publiclyAccessible: false,
    });

    this.secret = cluster.secret!;

    new cdk.CfnOutput(this, "DatabaseSecretArn", {
      value: this.secret.secretArn,
      exportName: "ArmouryDatabaseSecretArn",
    });
  }
}
