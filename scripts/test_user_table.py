import os, boto3, time

env_vars = {}
with open('C:/Users/HARIBHASKARAN A/.gemini/antigravity/scratch/resqfly/backend/.env') as f:
    for line in f:
        line = line.strip()
        if line and not line.startswith('#') and '=' in line:
            k, v = line.split('=', 1)
            env_vars[k.strip()] = v.strip().strip('"').strip("'")

session = boto3.Session(
    aws_access_key_id=env_vars.get('AWS_ACCESS_KEY_ID'),
    aws_secret_access_key=env_vars.get('AWS_SECRET_ACCESS_KEY'),
    region_name='ap-southeast-2'
)

dynamodb = session.resource('dynamodb', region_name='ap-southeast-2')
table = dynamodb.Table('resqfly_users')

# Put demo users
demo_users = [
    {
        "government_id": "GOV-DM-001",
        "name": "Commander Alex Reyes",
        "email": "a.reyes@eoc.gov",
        "role": "COORDINATOR",
        "password_hash": "2bb80e608034a74c2e5e1a387532d88d227f42ef4f85e4941656ec5671d4bf78", # Demo@1234
        "verified": True,
        "created_at": "2026-11-04T00:00:00Z"
    },
    {
        "government_id": "FR-001",
        "name": "Sergeant Priya Nair",
        "email": "p.nair@fieldrescue.gov",
        "role": "RESCUE_TEAM",
        "password_hash": "771e86a147ff6909470c968f44ff53e8704201389814d44530514930be8ea170", # Field@1234
        "verified": True,
        "created_at": "2026-11-04T00:00:00Z"
    }
]

for u in demo_users:
    res = table.put_item(Item=u)
    print("Put item response:", res.get('ResponseMetadata', {}).get('HTTPStatusCode'))

# Verify get_item
res1 = table.get_item(Key={"government_id": "GOV-DM-001"})
print("Fetched GOV-DM-001:", res1.get('Item'))
res2 = table.get_item(Key={"government_id": "FR-001"})
print("Fetched FR-001:", res2.get('Item'))
