export const htmlTemplate1 = (frontendLink: string, userId: string) => {
  return `<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Exciting Updates & Exclusive Offers</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            margin: 0;
            padding: 0;
            background-color: #f4f4f4;
        }
        .container {
            max-width: 600px;
            margin: 20px auto;
            background: #ffffff;
            padding: 20px;
            border-radius: 8px;
            box-shadow: 0 2px 5px rgba(0, 0, 0, 0.1);
        }
        .header {
            text-align: center;
            background-color: #0073e6;
            color: #ffffff;
            padding: 20px;
            border-radius: 8px 8px 0 0;
        }
        .content {
            padding: 20px;
            color: #333;
            font-size: 16px;
        }
        .cta-button {
            display: block;
            width: 200px;
            text-align: center;
            background: #0073e6;
            color: #ffffff;
            padding: 12px;
            border-radius: 5px;
            text-decoration: none;
            font-size: 18px;
            margin: 20px auto;
        }
        .footer {
            text-align: center;
            font-size: 14px;
            color: #888;
            padding: 20px;
        }
        @media (max-width: 600px) {
            .container {
                width: 90%;
                margin: auto;
            }
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>Big News & Special Deals Inside!</h1>
        </div>
        <div class="content">
            <p>Dear [Recipient's Name],</p>
            <p>We have some exciting updates and exclusive offers just for you! Stay ahead with our latest product launches and special discounts.</p>
            <p>🚀 Don't miss out on this opportunity to grab amazing deals!</p>
            <a href="https://www.trellify.com" class="cta-button">Claim Your Offer</a>
            <p>Thank you for being part of our community. We appreciate your support!</p>
        </div>
        <div class="footer">
            <p>&copy; 2025 YourCompany. All rights reserved.</p>
            <p><a href="${frontendLink}/distribution/unsubscribe/${userId}">Unsubscribe</a> | <a href="https://yourwebsite.com/privacy-policy">Privacy Policy</a></p>
        </div>
    </div>
</body>
</html>
`;
};
