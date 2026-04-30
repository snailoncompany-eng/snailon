#!/bin/bash
# Snailon Deploy Script
# Run: bash deploy.sh YOUR_VERCEL_TOKEN

TOKEN=${1:-$VERCEL_TOKEN}
if [ -z "$TOKEN" ]; then
  echo "Usage: bash deploy.sh <your-vercel-token>"
  echo "Get token at: https://vercel.com/account/tokens"
  exit 1
fi

TEAM_ID="team_HXiRhPnBd8nwFVTFrqzsAzKu"
PROJECT_ID="prj_7DSdGYUmv3leZHFs0DxjSH3X3wYV"

echo "→ Adding environment variables to Vercel..."

add_env() {
  local key=$1 val=$2 target=$3
  curl -s -X POST "https://api.vercel.com/v10/projects/${PROJECT_ID}/env?teamId=${TEAM_ID}" \
    -H "Authorization: Bearer ${TOKEN}" \
    -H "Content-Type: application/json" \
    -d "{\"key\":\"${key}\",\"value\":\"${val}\",\"type\":\"encrypted\",\"target\":[\"${target}\"]}" \
    > /dev/null
}

# Public env vars
add_env "NEXT_PUBLIC_SUPABASE_URL" "https://akxdpwunuwpumixrpegp.supabase.co" "production"
add_env "NEXT_PUBLIC_SUPABASE_URL" "https://akxdpwunuwpumixrpegp.supabase.co" "preview"
add_env "NEXT_PUBLIC_SUPABASE_ANON_KEY" "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFreGRwd3VudXdwdW1peHJwZWdwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc1NTQ0MzQsImV4cCI6MjA5MzEzMDQzNH0.sroSuWybFAtQai12IFY_y-avnDb0BIAgki2J1Ro9cgE" "production"
add_env "NEXT_PUBLIC_SUPABASE_ANON_KEY" "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFreGRwd3VudXdwdW1peHJwZWdwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc1NTQ0MzQsImV4cCI6MjA5MzEzMDQzNH0.sroSuWybFAtQai12IFY_y-avnDb0BIAgki2J1Ro9cgE" "preview"
add_env "NEXT_PUBLIC_BASE_URL" "https://snailon.com" "production"
add_env "NEXT_PUBLIC_BASE_URL" "https://snailon-prelaunch.vercel.app" "preview"
add_env "NEXT_PUBLIC_LAUNCH_DATE" "2026-05-21T00:00:00Z" "production"
add_env "NEXT_PUBLIC_LAUNCH_DATE" "2026-05-21T00:00:00Z" "preview"
# Server-only
add_env "SUPABASE_SERVICE_ROLE_KEY" "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFreGRwd3VudXdwdW1peHJwZWdwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NzU1NDQzNCwiZXhwIjoyMDkzMTMwNDM0fQ.kOdY8jsZReX7nY8bvNZktSV2MxCTqzQX8L0Q7jsJX_o" "production"
add_env "RESEND_API_KEY" "re_2ofGnQfQ_4GeKkwgWrvC4cYjeMe2xkyMf" "production"
add_env "WHOP_API_KEY" "apik_wGSjXm3lZ4Qx6_C4875455_C_afba4507f46eced2df0f2dbae3b4be242d9319edca3f0cecf1ab8cbf7a49e1" "production"
add_env "WHOP_WEBHOOK_SECRET" "ws_87462b35b2c98e38ca011e2e749fdc4b9b22b8e9b757a5a8456d7998e148e6db" "production"
add_env "WHOP_PRODUCT_ID" "prod_BhUZb0cl2LL4Z" "production"
add_env "WHOP_PLAN_ID" "plan_QHj8IcAuk1SRd" "production"
add_env "WHOP_COMPANY_ID" "biz_hSC2aH42zrkuvo" "production"

echo "✓ Env vars added"
echo ""
echo "→ Deploying to Vercel..."
vercel deploy --prod --token "$TOKEN" --team "$TEAM_ID" --yes
echo ""
echo "✓ Deployed! Visit: https://snailon-prelaunch.vercel.app"
