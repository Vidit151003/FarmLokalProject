# Docker Desktop Troubleshooting Guide

## Issue: "database isn't correctly mapped" Error

This is a known issue with fresh Docker Desktop installations on Windows/WSL2.

## Solution Steps

### Step 1: Restart Docker Desktop

1. Right-click Docker Desktop icon in system tray (bottom-right of Windows taskbar)
2. Click **"Quit Docker Desktop"**
3. Wait 10 seconds
4. Start **Docker Desktop** again from Start menu
5. Wait for Docker to fully start (whale icon should be steady, not animated)
6. This usually takes 30-60 seconds

### Step 2: Try Starting Containers

Once Docker Desktop is fully running:

```powershell
cd "D:\My Projects\FarmLokal"
docker compose up -d
```

### Step 3: Verify Containers Started

```powershell
docker ps
```

You should see 2 containers running:
- `farmlokal-mysql-1` (MySQL 8.0)
- `farmlokal-redis-1` (Redis 7-alpine)

## Alternative Fix (If Above Doesn't Work)

### Enable WSL2 Integration

1. Open **Docker Desktop**
2. Click Settings (gear icon)
3. Go to **Resources** → **WSL Integration**
4. Toggle ON: "Enable integration with my default WSL distro"
5. Enable integration for Ubuntu or your WSL distribution
6. Click **"Apply & Restart"**

### Reset Docker Data (Last Resort)

If nothing works:

1. Open Docker Desktop Settings
2. Go to **Troubleshoot**
3. Click **"Clean / Purge data"**
4. Restart Docker Desktop
5. Try `docker compose up -d` again

## Once Containers Are Running

Return to the conversation and let me know - I'll automatically:

1. ✅ Run database migrations
2. ✅ Seed 1 million products
3. ✅ Start the FarmLokal server
4. ✅ Test all API endpoints
5. ✅ Verify complete system functionality

---

**Current Status:** Waiting for Docker containers to start successfully.
