# Browser Phone Caller - Complete Production Deployment Guide

## 📦 Project Structure

```
browser-phone-caller/
├── server.js                 # Backend server
├── public/
│   └── index.html           # Frontend application
├── package.json             # Node.js dependencies
├── .env                     # Environment variables (DO NOT COMMIT)
├── .env.example             # Environment template
├── .gitignore              # Git ignore file
└── README.md               # This file
```

## 🚀 Quick Start

### 1. Prerequisites

- Node.js 14+ installed
- Twilio account (sign up at https://www.twilio.com)
- A Twilio phone number with Voice capabilities

### 2. Twilio Setup

#### A. Get Your Credentials

1. Go to https://console.twilio.com
2. Copy your **Account SID** and **Auth Token**
3. Buy a phone number or use an existing one

#### B. Create a TwiML App

1. Go to Console → Voice → TwiML → TwiML Apps
2. Click "Create new TwiML App"
3. Set these URLs (replace with your server URL):
   - **Voice Request URL**: `https://your-server.com/api/voice` (HTTP POST)
   - **Voice Status Callback URL**: `https://your-server.com/api/call-status` (HTTP POST)
4. Save and copy the **TwiML App SID**

### 3. Installation

```bash
# Clone or create project directory
mkdir browser-phone-caller
cd browser-phone-caller

# Initialize npm
npm init -y

# Install dependencies
npm install express twilio cors dotenv body-parser
```

### 4. Configuration

Create a `.env` file:

```env
# Twilio Credentials
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=your_auth_token_here
TWILIO_PHONE_NUMBER=+15551234567
TWILIO_TWIML_APP_SID=APxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx

# Optional: Create API Key for better security
# TWILIO_API_KEY=SKxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
# TWILIO_API_SECRET=your_api_secret_here

# Server Configuration
PORT=3000
NODE_ENV=production
```

### 5. File Setup

**package.json:**

```json
{
  "name": "browser-phone-caller",
  "version": "1.0.0",
  "description": "Browser-based phone calling application",
  "main": "server.js",
  "scripts": {
    "start": "node server.js",
    "dev": "nodemon server.js"
  },
  "dependencies": {
    "express": "^4.18.2",
    "twilio": "^4.19.0",
    "cors": "^2.8.5",
    "dotenv": "^16.3.1",
    "body-parser": "^1.20.2"
  },
  "devDependencies": {
    "nodemon": "^3.0.2"
  }
}
```

**.gitignore:**

```
node_modules/
.env
*.log
.DS_Store
```

**.env.example:**

```env
TWILIO_ACCOUNT_SID=your_account_sid
TWILIO_AUTH_TOKEN=your_auth_token
TWILIO_PHONE_NUMBER=your_twilio_phone
TWILIO_TWIML_APP_SID=your_twiml_app_sid
PORT=3000
NODE_ENV=production
```

### 6. Run Locally

```bash
# Development mode with auto-reload
npm run dev

# Production mode
npm start
```

Visit: http://localhost:3000

## 🌐 Deployment Options

### Option 1: Deploy to Heroku

```bash
# Install Heroku CLI
# https://devcenter.heroku.com/articles/heroku-cli

# Login to Heroku
heroku login

# Create app
heroku create your-app-name

# Set environment variables
heroku config:set TWILIO_ACCOUNT_SID=ACxxx...
heroku config:set TWILIO_AUTH_TOKEN=your_token
heroku config:set TWILIO_PHONE_NUMBER=+15551234567
heroku config:set TWILIO_TWIML_APP_SID=APxxx...

# Deploy
git init
git add .
git commit -m "Initial commit"
git push heroku main

# Open app
heroku open
```

### Option 2: Deploy to Railway

1. Sign up at https://railway.app
2. Create new project → Deploy from GitHub
3. Add environment variables in Railway dashboard
4. Deploy automatically

### Option 3: Deploy to DigitalOcean

```bash
# Create droplet with Node.js
# SSH into server

# Clone repository
git clone your-repo-url
cd browser-phone-caller

# Install dependencies
npm install

# Install PM2 for process management
npm install -g pm2

# Start application
pm2 start server.js --name phone-caller

# Setup nginx reverse proxy
sudo apt install nginx

# Configure nginx
sudo nano /etc/nginx/sites-available/phone-caller
```

Nginx configuration:

```nginx
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

```bash
# Enable site
sudo ln -s /etc/nginx/sites-available/phone-caller /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx

# Setup SSL with Let's Encrypt
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d your-domain.com
```

### Option 4: Deploy to AWS (EC2)

1. Launch EC2 instance (Ubuntu)
2. Configure security groups (ports 80, 443, 22)
3. Follow DigitalOcean steps above
4. Consider using Elastic Beanstalk for easier deployment

## 🔒 Security Best Practices

### 1. Use API Keys Instead of Auth Token

Create an API Key in Twilio Console:

1. Go to Account → API Keys
2. Create new API Key
3. Use in `.env`:

```env
TWILIO_API_KEY=SKxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_API_SECRET=your_api_secret_here
```

### 2. Implement Rate Limiting

```javascript
const rateLimit = require("express-rate-limit");

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
});

app.use("/api/", limiter);
```

### 3. Add Authentication

```javascript
const jwt = require("jsonwebtoken");

// Middleware
function authenticateToken(req, res, next) {
  const token = req.headers["authorization"]?.split(" ")[1];

  if (!token) return res.sendStatus(401);

  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) return res.sendStatus(403);
    req.user = user;
    next();
  });
}

app.post("/api/token", authenticateToken, (req, res) => {
  // Generate Twilio token
});
```

### 4. HTTPS Only

Always use HTTPS in production. Use Let's Encrypt for free SSL certificates.

## 📊 Monitoring & Analytics

### Add Call Logging

```javascript
app.post("/api/call-status", async (req, res) => {
  const callData = {
    sid: req.body.CallSid,
    from: req.body.From,
    to: req.body.To,
    status: req.body.CallStatus,
    duration: req.body.CallDuration,
    timestamp: new Date(),
  };

  // Save to database
  await saveCallLog(callData);

  res.sendStatus(200);
});
```

### Monitor with Twilio Console

- View call logs in Twilio Console → Monitor → Logs → Calls
- Set up alerts for errors
- Track usage and costs

## 🧪 Testing

### Test Locally with ngrok

```bash
# Install ngrok
npm install -g ngrok

# Start your server
npm start

# In another terminal, start ngrok
ngrok http 3000

# Use ngrok URL in Twilio TwiML App configuration
```

### Test Calls

1. Enter a valid phone number
2. Click "Call"
3. Answer the phone
4. Test call quality and features

## 💰 Cost Estimation

Twilio pricing (approximate):

- Outbound calls: $0.013/min (US)
- Phone number: $1/month
- Client SDK: Free

Example monthly costs:

- 100 minutes of calls: ~$1.30
- Phone number: $1.00
- **Total: ~$2.30/month**

## 🐛 Troubleshooting

### Issue: "Failed to initialize"

- Check Twilio credentials in `.env`
- Verify TwiML App SID is correct
- Check server logs for errors

### Issue: "Call not connecting"

- Verify phone number format (+1XXXXXXXXXX)
- Check TwiML App voice URL is correct
- Ensure ngrok/server is publicly accessible
- Check Twilio Console for error logs

### Issue: "No audio"

- Check browser microphone permissions
- Verify WebRTC is supported (Chrome, Firefox, Safari)
- Test with different browser
- Check network/firewall settings

### Issue: "Token generation failed"

- Verify API credentials
- Check Account SID and Auth Token
- Ensure TwiML App exists

## 📝 Features Included

✅ Browser-to-phone calling
✅ Real-time call status
✅ Call timer
✅ Audio level indicator
✅ Call history API endpoint
✅ Error handling
✅ Responsive design
✅ Production-ready code

## 🔄 Future Enhancements

- [ ] User authentication
- [ ] Call recording
- [ ] Voicemail
- [ ] Conference calling
- [ ] Call history UI
- [ ] SMS integration
- [ ] Contact management
- [ ] Call analytics dashboard

## 📞 Support

- Twilio Docs: https://www.twilio.com/docs/voice
- Twilio Support: https://support.twilio.com
- GitHub Issues: Create an issue in your repository

## 📄 License

MIT License - feel free to use in your projects!

---

**Ready to deploy? Follow the steps above and start making calls! 🚀**
