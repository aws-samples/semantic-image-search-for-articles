#!/usr/bin/env node
import { program } from "commander";
import process from "process";
import chalk from "chalk";
import toml from "toml";
import { promises as fs } from "fs";
import { CloudFormationClient, DescribeStacksCommand } from "@aws-sdk/client-cloudformation";

async function parseToml(tomlPath) {
  const tomlData = await readToml(tomlPath);
  try {
    return {
      region: tomlData.default.deploy.parameters.region,
      stackName: tomlData.default.deploy.parameters.stack_name
    };
  } catch {
    console.log(chalk.yellow("Unable to find Stack Name and/or Region in specified toml."))
    console.log("Expecting to find properties with names:", chalk.yellow("stack_name"), "and", chalk.yellow("region"), "in the", chalk.yellow("[default.deploy.parameters]"), "section of the toml file.")
    console.log("Ensure the toml file specified has these properties. Alternatively specify these values directly as arguments instead of the toml file path.")
    process.exit(1);
  }
}

async function readToml(tomlPath) {
  try {
    const tomlRaw = await fs.readFile(tomlPath, "utf-8");
    const tomlData = toml.parse(tomlRaw);
    return tomlData;
  } catch (error) {
    if (error.name == "Error" && error.code == "ENOENT") {
      console.log(chalk.red(error.message));
    } else if (error.name == "SyntaxError") {
      console.log(chalk.red("Unable to parse specified toml file"));
    } else {
      console.log(chalk.red(error));
    }
    process.exit(1);
  }
}

async function getCloudFormationOutputs(region, stackName) {
  const cfnClient = new CloudFormationClient({ region: region });
  const describeStacks = new DescribeStacksCommand({ StackName: stackName });
  try {
    const describeStacksResp = await cfnClient.send(describeStacks);
    return describeStacksResp.Stacks[0].Outputs;
  } catch (error){
    console.log(chalk.red(error));
    process.exit(1);
  }
}

async function run(exportsTemplate, options) {
  if (options.tomlFile) {
    const tomlData = await parseToml(options.tomlFile);
    options.region = tomlData.region;
    options.stackName = tomlData.stackName;
  } 
  
  const outputs = await getCloudFormationOutputs(options.region, options.stackName);
  let exportsData = await fs.readFile(exportsTemplate, "utf-8");
  const exportsParams = [...new Set([...exportsData.matchAll("{(.+)}")].map((match) => match[1]))];
  const outputsKeys = outputs.map((output) => output.OutputKey);
  const missingOutputs = exportsParams.filter(x => !outputsKeys.includes(x));
  if (missingOutputs.length > 0) {
    console.log(chalk.red("The following required exports were not found as outputs of the stack:"), chalk.red.bold(missingOutputs));
    process.exit(1);
  }
  outputs.forEach((output) => exportsData = exportsData.replaceAll(`{${output.OutputKey}}`, output.OutputValue));
  await fs.writeFile(options.outputPath, exportsData);
}

program
  .name('exports')
  .version('0.1.0')
  .description("Populate the aws-exports.js template file with the CloudFormation stack outputs")
  .argument("[exportsTemplate]", "The path to the aws-exports template file.", "./src/aws-exports-template.js")
  .option("-t, --toml-file <value>", "The path to the samconfig toml file.")
  .option("-s, --stack-name <value>", "The name of the CloudFormation Stack.")
  .option("-r, --region <value>", "The AWS region.")
  .option("-o, --output-path <value>", "The output file path.", "./src/aws-exports.js")
  .action((exportsTemplate, options) => {
    if (!options.tomlFile && !options.stackName && !options.region) {
      console.log(chalk.yellow("Please specify a toml file or a stack name and region"))
      process.exit(1);
    } else if (!options.tomlFile && !(options.stackName && options.region)) {
      console.log(chalk.yellow("Please supply a stack name and region."))
      process.exit(1);
    } else if (options.tomlFile && (options.stackName || options.region)) {
      console.log(chalk.yellow("Please supply either a toml file or a stack name and region, not both."))
      process.exit(1);
    }
    run(exportsTemplate, options);
  });
program.parse();
