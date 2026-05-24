#!/usr/bin/env node
import * as cdk from "aws-cdk-lib";
import { DatabaseStack } from "../lib/database-stack";
import { ServiceStack } from "../lib/service-stack";

const app = new cdk.App();

const env = {
  account: process.env.CDK_DEFAULT_ACCOUNT,
  region: process.env.CDK_DEFAULT_REGION ?? "ap-southeast-1",
};

const database = new DatabaseStack(app, "ArmouryDatabase", { env });

new ServiceStack(app, "ArmouryService", {
  env,
  vpc: database.vpc,
  databaseSecretArn: database.secret.secretArn,
  databaseSecurityGroup: database.securityGroup,
});
