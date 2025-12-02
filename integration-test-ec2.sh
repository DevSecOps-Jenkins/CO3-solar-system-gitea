#!/usr/bin/env bash
set -euo pipefail

# Simple integration test script for EC2-hosted solar-system service
# Expectations:
#  - EC2 instance has Tag Name=ec2-solar-system
#  - Service is reachable on port 3000
#  - GET /live returns HTTP 200
#  - POST /planet with {"id":"3"} returns JSON with field "name" == "Earth"

REGION=${AWS_REGION:-us-east-1}
TAG_NAME=${EC2_TAG_NAME:-ec2-solar-system}
TEST_ID=${TEST_PLANET_ID:-3}

echo "[integration-test] region=${REGION}, tag=${TAG_NAME}, test_id=${TEST_ID}"

# 1) Find public IP of instance filtered by Name tag
echo "[integration-test] Looking up instance with tag Name=${TAG_NAME} ..."
INSTANCE_IP=$(aws ec2 describe-instances \
  --region "${REGION}" \
  --filters "Name=tag:Name,Values=${TAG_NAME}" "Name=instance-state-name,Values=running" \
  --query "Reservations[].Instances[?PublicIpAddress!=null].PublicIpAddress | [0]" \
  --output text)

if [[ -z "${INSTANCE_IP}" || "${INSTANCE_IP}" == "None" ]]; then
  echo "[integration-test][ERROR] No running EC2 instance with tag Name=${TAG_NAME} and public IP found in region ${REGION}."
  exit 2
fi

echo "[integration-test] Found instance IP: ${INSTANCE_IP}"

# 2) Health check: GET /live
LIVE_URL="http://${INSTANCE_IP}:3000/live"
echo "[integration-test] Checking health endpoint: ${LIVE_URL}"
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "${LIVE_URL}" || true)
echo "[integration-test] HTTP code: ${HTTP_CODE}"

if [[ "${HTTP_CODE}" -ne 200 ]]; then
  echo "[integration-test][ERROR] Health check failed (HTTP ${HTTP_CODE})."
  exit 3
fi

# 3) POST /planet
POST_URL="http://${INSTANCE_IP}:3000/planet"
echo "[integration-test] POSTing to ${POST_URL} payload id=${TEST_ID}"
RESPONSE=$(curl -s -X POST "${POST_URL}" -H "Content-Type: application/json" -d "{\"id\":\"${TEST_ID}\"}" || true)
echo "[integration-test] Raw response: ${RESPONSE}"

# 4) Parse response JSON and check .name == "Earth"
PLANET_NAME=$(echo "${RESPONSE}" | jq -r '.name // empty' || true)
echo "[integration-test] Parsed planet name: ${PLANET_NAME}"

if [[ "${PLANET_NAME}" == "Earth" ]]; then
  echo "[integration-test] Planet name check PASSED: ${PLANET_NAME}"
  echo "[integration-test] Integration tests PASSED"
  exit 0
else
  echo "[integration-test][ERROR] Planet name check FAILED. Expected 'Earth', got '${PLANET_NAME}'"
  exit 4
fi
