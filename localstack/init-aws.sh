#!/usr/bin/env bash
# LocalStack Initialization script for VayuPath
set -eo pipefail

echo "Initializing LocalStack resources for VayuPath..."

export AWS_ACCESS_KEY_ID=test
export AWS_SECRET_ACCESS_KEY=test
export AWS_DEFAULT_REGION=ap-south-1

ENDPOINT="http://localhost:4566"

# 1. Create DynamoDB Tables
echo "Creating DynamoDB tables..."
awslocal dynamodb create-table \
    --table-name vayupath-readings-dev \
    --attribute-definitions AttributeName=station_id,AttributeType=S AttributeName=timestamp,AttributeType=S \
    --key-schema AttributeName=station_id,KeyType=HASH AttributeName=timestamp,KeyType=RANGE \
    --billing-mode PAY_PER_REQUEST || true

awslocal dynamodb create-table \
    --table-name vayupath-schools-dev \
    --attribute-definitions AttributeName=school_id,AttributeType=S \
    --key-schema AttributeName=school_id,KeyType=HASH \
    --billing-mode PAY_PER_REQUEST || true

awslocal dynamodb create-table \
    --table-name vayupath-subscriptions-dev \
    --attribute-definitions AttributeName=subscription_id,AttributeType=S \
    --key-schema AttributeName=subscription_id,KeyType=HASH \
    --billing-mode PAY_PER_REQUEST || true

# 2. Create S3 Cache Bucket
echo "Creating S3 cache bucket..."
awslocal s3 mb s3://vayupath-cache-dev-000000000000 || true

# 3. Create SNS Alert Topic
echo "Creating SNS topic..."
awslocal sns create-topic --name vayupath-alerts-topic-dev || true

echo "✅ VayuPath LocalStack AWS resources initialized successfully!"
