"""Direct Boto3 DynamoDB table provisioning script for RESQFLY backend."""
import os
import sys
from pathlib import Path

# Load backend/.env
env_file = Path(__file__).resolve().parent.parent.parent / ".env"
if env_file.exists():
    with open(env_file, "r", encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if line and not line.startswith("#") and "=" in line:
                k, v = line.split("=", 1)
                os.environ[k.strip()] = v.strip().strip("'").strip('"')

import boto3
from botocore.exceptions import ClientError

def create_tables():
    region = os.environ.get("AWS_REGION", "us-east-1")
    dynamodb = boto3.client("dynamodb", region_name=region)
    
    tables = [
        {
            "TableName": os.environ.get("DYNAMODB_TELEMETRY_TABLE", "resqfly_telemetry"),
            "KeySchema": [
                {"AttributeName": "drone_id", "KeyType": "HASH"},
                {"AttributeName": "timestamp", "KeyType": "RANGE"}
            ],
            "AttributeDefinitions": [
                {"AttributeName": "drone_id", "AttributeType": "S"},
                {"AttributeName": "timestamp", "AttributeType": "N"}
            ],
            "BillingMode": "PAY_PER_REQUEST"
        },
        {
            "TableName": os.environ.get("DYNAMODB_MISSION_TABLE", "resqfly_missions"),
            "KeySchema": [
                {"AttributeName": "mission_id", "KeyType": "HASH"}
            ],
            "AttributeDefinitions": [
                {"AttributeName": "mission_id", "AttributeType": "S"}
            ],
            "BillingMode": "PAY_PER_REQUEST"
        }
    ]

    for t in tables:
        name = t["TableName"]
        try:
            dynamodb.create_table(**t)
            print(f"[+] Created table {name}")
        except ClientError as e:
            if e.response["Error"]["Code"] == "ResourceInUseException":
                print(f"[*] Table {name} already exists.")
            else:
                print(f"[!] Table creation note for {name}: {e}")

if __name__ == "__main__":
    create_tables()
