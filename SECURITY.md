# Security Policy

## Supported Versions

| Version | Supported          |
| ------- | ------------------ |
| 1.0.x   | :white_check_mark: |
| < 1.0   | :x:                |

## Reporting a Vulnerability

We take security seriously. If you discover a security vulnerability, please follow these steps:

### 1. Do Not Disclose Publicly

Please **do not** create a public GitHub issue for security vulnerabilities.

### 2. Contact Us Directly

Send an email to **security@optimio.app** with:
- Description of the vulnerability
- Steps to reproduce
- Potential impact
- Suggested fix (if any)

### 3. What to Expect

- **Acknowledgment** within 48 hours
- **Assessment** within 1 week
- **Resolution** timeline based on severity

### 4. Disclosure Policy

We follow a 90-day disclosure policy:
- We will work to fix vulnerabilities within 90 days
- After fix is released, we will publicly disclose (with your permission)
- Credit will be given to the reporter

## Security Measures

### Current Implementation

- **Content Security Policy (CSP)** - Prevents XSS attacks
- **HTTPS Only** - All traffic encrypted
- **Secure Headers** - X-Frame-Options, X-Content-Type-Options, etc.
- **Input Sanitization** - All user inputs validated
- **Rate Limiting** - API request throttling
- **Dependency Scanning** - Automated vulnerability checks

### Data Protection

- All data stored locally (IndexedDB)
- Google OAuth tokens encrypted
- No tracking or analytics without consent
- GDPR compliant

## Known Limitations

- Offline mode stores data locally (device must be secured)
- Google Calendar API has its own rate limits
- Browser extensions can access local storage

## Security Best Practices for Users

1. Use a strong device password
2. Keep browser updated
3. Only install from trusted sources
4. Enable 2FA on Google account
5. Log out on shared devices

---

Thank you for helping keep Optimio secure!
