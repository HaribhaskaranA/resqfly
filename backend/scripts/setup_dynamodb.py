"""Standalone DynamoDB Table Setup Script for RESQFLY."""
import os
import sys
import time
from pathlib import Path

# Auto-load backend/.env
env_file = Path(__file__).resolve().parent.parent / ".env"
if env_file.exists():
    with open(env_file, "r", encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if line and not line.startswith("#") and "=" in line:
                k, v = line.split("=", 1)
                os.environ[k.strip()] = v.strip().strip("'").strip('"')

import boto3
from botocore.exceptions import ClientError

region = os.getenv("AWS_REGION", "us-east-1")
print("=" * 65)
print(f"[*] RESQFLY DynamoDB Setup | Target Region: {region}")
print("=" * 65)

# Connect using boto3 client
dynamodb = boto3.client("dynamodb", region_name=region)

tables = [
    {
        "TableName": os.getenv("DYNAMODB_TELEMETRY_TABLE", "resqfly_telemetry"),
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
        "TableName": os.getenv("DYNAMODB_MISSION_TABLE", "resqfly_missions"),
        "KeySchema": [
            {"AttributeName": "mission_id", "KeyType": "HASH"}
        ],
        "AttributeDefinitions": [
            {"AttributeName": "mission_id", "AttributeType": "S"}
        ],
        "BillingMode": "PAY_PER_REQUEST"
    }
]

created_or_existing = []

for table_def in tables:
    name = table_def["TableName"]
    print(f"\n[*] Processing Table '{name}'...")
    try:
        desc = dynamodb.describe_table(TableName=name)
        status = desc["Table"]["TableStatus"]
        print(f"[*] Table '{name}' already exists (Status: {status})")
        created_or_existing.append(name)
    except ClientError as e:
        code = e.response["Error"]["Code"]
        if code == "ResourceNotFoundException":
            print(f"[*] Creating Table '{name}' (BillingMode=PAY_PER_REQUEST)...")
            try:
                dynamodb.create_table(**table_def)
                print(f"[+] CreateTable request issued for '{name}'")
                created_or_existing.append(name)
            except ClientError as ce:
                print(f"[-] Failed to create table '{name}': {ce}")
        else:
            print(f"[-] Error querying table '{name}': {e}")

# Wait until all tables report status ACTIVE
print("\n[*] Verifying ACTIVE status for all tables...")
all_active = True
for name in created_or_existing:
    try:
        while True:
            desc = dynamodb.describe_table(TableName=name)
            status = desc["Table"]["TableStatus"]
            if status == "ACTIVE":
                print(f"[+] Table '{name}' is ACTIVE and ready for operations!")
                break
            print(f"    Table '{name}' status: {status}. Waiting 2s...")
            time.sleep(2)
    except Exception as e:
        print(f"[-] Could not verify status for '{name}': {e}")
        all_active = False

print("\n" + "=" * 65)
if all_active and len(created_or_existing) == len(tables):
    print("[SUCCESS] All DynamoDB tables successfully provisioned and ACTIVE in AWS!")
else:
    print("[COMPLETED] Setup execution finished. See diagnostic logs above.")
print("=" * 65)
