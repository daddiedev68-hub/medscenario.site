
// test-pesapal.js - Run this to test PesaPal API
const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));
require('dotenv').config();

async function testPesapal() {
    console.log('🔍 TESTING PESAPAL API INTEGRATION');
    console.log('===================================');
    
    // Step 1: Check if keys exist
    console.log('\n📋 Step 1: Checking Environment Variables');
    console.log('PESAPAL_CONSUMER_KEY:', process.env.PESAPAL_CONSUMER_KEY ? '✅ EXISTS' : '❌ MISSING');
    console.log('PESAPAL_CONSUMER_SECRET:', process.env.PESAPAL_CONSUMER_SECRET ? '✅ EXISTS' : '❌ MISSING');
    console.log('PESAPAL_ENVIRONMENT:', process.env.PESAPAL_ENVIRONMENT || 'sandbox');
    
    if (!process.env.PESAPAL_CONSUMER_KEY || !process.env.PESAPAL_CONSUMER_SECRET) {
        console.log('\n❌ ERROR: Missing API keys in .env file');
        return;
    }
    
    // Step 2: Try to get token
    console.log('\n📋 Step 2: Getting PesaPal Token...');
    const auth = Buffer.from(`${process.env.PESAPAL_CONSUMER_KEY}:${process.env.PESAPAL_CONSUMER_SECRET}`).toString('base64');
    const apiUrl = 'https://cybqa.pesapal.com/pesapalv3/api';
    
    try {
        const tokenResponse = await fetch(`${apiUrl}/Auth/RequestToken`, {
            method: 'POST',
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json',
                'Authorization': `Basic ${auth}`
            },
            body: JSON.stringify({})
        });
        
        const tokenData = await tokenResponse.json();
        
        if (tokenResponse.ok && tokenData.token) {
            console.log('✅ Token obtained successfully!');
            console.log('Token:', tokenData.token.substring(0, 50) + '...');
        } else {
            console.log('❌ Failed to get token');
            console.log('Status:', tokenResponse.status);
            console.log('Response:', JSON.stringify(tokenData, null, 2));
            return;
        }
        
        // Step 3: Try to create a test order
        console.log('\n📋 Step 3: Creating Test Order...');
        
        const testOrder = {
            order: {
                amount: 3000,
                currency: "TZS",
                description: "Test Payment",
                order_tracking_id: `TEST-${Date.now()}`
            },
            billing_details: {
                email_address: "test@example.com",
                phone_number: "0712345678",
                country_code: "TZ",
                first_name: "Test",
                last_name: "User"
            },
            return_url: "http://localhost:5500/payment-callback.html",
            notification_url: "http://localhost:5000/api/payment/webhook"
        };
        
        const orderResponse = await fetch(`${apiUrl}/Transactions/SubmitOrderRequest`, {
            method: 'POST',
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${tokenData.token}`
            },
            body: JSON.stringify(testOrder)
        });
        
        const orderData = await orderResponse.json();
        
        if (orderResponse.ok && orderData.redirect_url) {
            console.log('✅ Order created successfully!');
            console.log('Redirect URL:', orderData.redirect_url);
            console.log('\n🎉 PESAPAL INTEGRATION IS WORKING!');
        } else {
            console.log('❌ Failed to create order');
            console.log('Status:', orderResponse.status);
            console.log('Response:', JSON.stringify(orderData, null, 2));
        }
        
    } catch (error) {
        console.log('❌ NETWORK ERROR:', error.message);
        console.log('Make sure you have internet connection and the PesaPal API is reachable.');
    }
}

testPesapal();