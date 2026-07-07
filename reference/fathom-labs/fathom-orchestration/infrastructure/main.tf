terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 3.0"
    }
  }

  backend "s3" {
    region = "us-east-1"
    bucket = "fathom-terraform-states"
    key    = "fathom-orchestration"
    dynamodb_table = "fathom-terraform-locks"
  }
}

# Configure the AWS Provider
provider "aws" {
  region = "us-east-1"
}
