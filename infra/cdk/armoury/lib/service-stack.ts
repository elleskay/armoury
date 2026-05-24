import * as cdk from "aws-cdk-lib";
import * as ec2 from "aws-cdk-lib/aws-ec2";
import * as ecs from "aws-cdk-lib/aws-ecs";
import * as ecsPatterns from "aws-cdk-lib/aws-ecs-patterns";
import * as ecr from "aws-cdk-lib/aws-ecr";
import * as secretsmanager from "aws-cdk-lib/aws-secretsmanager";
import { Construct } from "constructs";

export interface ServiceStackProps extends cdk.StackProps {
  vpc: ec2.IVpc;
  databaseSecretArn: string;
  databaseSecurityGroup: ec2.ISecurityGroup;
}

export class ServiceStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: ServiceStackProps) {
    super(scope, id, props);

    const repository = ecr.Repository.fromRepositoryName(this, "AppRepo", "platform/apps");

    const dbSecret = secretsmanager.Secret.fromSecretCompleteArn(
      this,
      "DbSecret",
      props.databaseSecretArn,
    );

    const cluster = new ecs.Cluster(this, "Cluster", {
      vpc: props.vpc,
      containerInsightsV2: ecs.ContainerInsights.ENABLED,
    });

    const taskDef = new ecs.FargateTaskDefinition(this, "TaskDef", {
      cpu: 512,
      memoryLimitMiB: 1024,
    });

    const container = taskDef.addContainer("Web", {
      image: ecs.ContainerImage.fromEcrRepository(repository, "armoury-latest"),
      logging: ecs.LogDrivers.awsLogs({ streamPrefix: "armoury" }),
      environment: {
        NODE_ENV: "production",
        AUTH_TRUST_HOST: "true",
      },
      secrets: {
        DATABASE_URL: ecs.Secret.fromSecretsManager(dbSecret, "uri"),
        AUTH_SECRET: ecs.Secret.fromSecretsManager(dbSecret, "auth_secret"),
      },
      healthCheck: {
        command: ["CMD-SHELL", "wget -qO- http://localhost:3000/api/health || exit 1"],
        interval: cdk.Duration.seconds(30),
        timeout: cdk.Duration.seconds(5),
        retries: 3,
        startPeriod: cdk.Duration.seconds(30),
      },
    });

    container.addPortMappings({ containerPort: 3000 });

    const service = new ecsPatterns.ApplicationLoadBalancedFargateService(this, "WebService", {
      cluster,
      taskDefinition: taskDef,
      desiredCount: 2,
      publicLoadBalancer: true,
      circuitBreaker: { rollback: true },
      taskSubnets: { subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS },
    });

    service.targetGroup.configureHealthCheck({
      path: "/api/health",
      interval: cdk.Duration.seconds(30),
      timeout: cdk.Duration.seconds(5),
      healthyThresholdCount: 2,
      unhealthyThresholdCount: 3,
    });

    props.databaseSecurityGroup.addIngressRule(
      service.service.connections.securityGroups[0],
      ec2.Port.tcp(5432),
      "Armoury Fargate service to RDS",
    );

    new cdk.CfnOutput(this, "ServiceUrl", {
      value: `http://${service.loadBalancer.loadBalancerDnsName}`,
    });
  }
}
