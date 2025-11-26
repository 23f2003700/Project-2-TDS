/**
 * Quiz Page Inspector
 * Inspects the quiz page structure to understand submission mechanism
 */

require('dotenv').config();
const { chromium } = require('playwright');

async function inspectQuiz() {
  console.log('\n📋 Inspecting Quiz Page Structure\n');
  
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();
  
  try {
    console.log('🌐 Loading quiz page...');
    await page.goto('https://exam.sanand.workers.dev/tds-2025-09-ga1', {
      waitUntil: 'networkidle'
    });
    
    await page.waitForTimeout(3000);
    
    console.log('\n=== PAGE ANALYSIS ===\n');
    
    // Extract all forms
    const forms = await page.$$eval('form', forms => 
      forms.map(f => ({
        action: f.action,
        method: f.method,
        id: f.id,
        class: f.className
      }))
    );
    console.log('Forms found:', JSON.stringify(forms, null, 2));
    
    // Extract all buttons
    const buttons = await page.$$eval('button, input[type="submit"], input[type="button"]', btns =>
      btns.map(b => ({
        type: b.type,
        text: b.innerText || b.value,
        id: b.id,
        class: b.className
      }))
    );
    console.log('\nButtons found:', JSON.stringify(buttons, null, 2));
    
    // Extract all inputs
    const inputs = await page.$$eval('input, textarea, select', inputs =>
      inputs.map(i => ({
        type: i.type,
        name: i.name,
        id: i.id,
        value: i.value,
        placeholder: i.placeholder
      }))
    );
    console.log('\nInputs found:', JSON.stringify(inputs, null, 2));
    
    // Get page text
    const text = await page.textContent('body');
    console.log('\nPage Text (first 500 chars):');
    console.log(text.substring(0, 500));
    
    // Check for data attributes or API endpoints in scripts
    const dataAttributes = await page.evaluate(() => {
      const elements = document.querySelectorAll('[data-api], [data-submit], [data-endpoint]');
      return Array.from(elements).map(el => ({
        tag: el.tagName,
        dataApi: el.getAttribute('data-api'),
        dataSubmit: el.getAttribute('data-submit'),
        dataEndpoint: el.getAttribute('data-endpoint')
      }));
    });
    console.log('\nData attributes found:', JSON.stringify(dataAttributes, null, 2));
    
    console.log('\n\n⏸️  Browser window is open - inspect the page manually');
    console.log('Press Ctrl+C to close when done\n');
    
    // Keep browser open for manual inspection
    await page.waitForTimeout(300000); // 5 minutes
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await browser.close();
  }
}

inspectQuiz();
