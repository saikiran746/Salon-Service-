const express = require('express');
const cors = require('cors');
const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = 9090;

app.use(cors({ origin: '*' }));
app.use(express.json());

app.get('/ping', (req, res) => {
  res.json({ success: true, message: 'pong' });
});

app.post('/prepare-whatsapp', (req, res) => {
  const { phone, name, invoiceNumber, totalAmount, pdfPath, message, delay } = req.body;

  if (!phone || !pdfPath) {
    return res.status(400).json({ success: false, message: 'Missing phone or pdfPath' });
  }

  // Check if file exists
  if (!fs.existsSync(pdfPath)) {
    console.error(`PDF not found at: ${pdfPath}`);
    return res.status(404).json({ success: false, message: `PDF file not found at ${pdfPath}` });
  }

  const automationDelay = parseInt(delay) || 3000;

  // Escape variables for PowerShell
  const escapedPdfPath = pdfPath.replace(/\\/g, '\\\\');
  const escapedMessage = message.replace(/"/g, '`"').replace(/'/g, '`\'');

  // URL-encode the message text so it passes cleanly to the URI scheme
  const encodedMessage = encodeURIComponent(message);

  // PowerShell script
  const psScript = `
    try {
      # 1. Open WhatsApp to the customer's phone number
      Start-Process "whatsapp://send?phone=91${phone}"
      Start-Sleep -Milliseconds ${automationDelay}

      # 2. Copy the PDF file to clipboard using .NET
      Add-Type -AssemblyName System.Windows.Forms
      $fileList = New-Object System.Collections.Specialized.StringCollection
      $fileList.Add("${escapedPdfPath}")
      [System.Windows.Forms.Clipboard]::SetFileDropList($fileList)
      Start-Sleep -Milliseconds 500

      # 3. Focus WhatsApp and Paste PDF (Ctrl+V)
      $wshell = New-Object -ComObject wscript.shell;
      $wshell.AppActivate('WhatsApp')
      Start-Sleep -Milliseconds 500
      $wshell.SendKeys('^v')
      Start-Sleep -Milliseconds 2000

      # 4. Copy the invoice message to clipboard and paste it into the file caption input (which is focused by default)
      [System.Windows.Forms.Clipboard]::SetText("${escapedMessage}")
      Start-Sleep -Milliseconds 300
      $wshell.AppActivate('WhatsApp')
      Start-Sleep -Milliseconds 500
      $wshell.SendKeys('^v')
      Start-Sleep -Milliseconds 1000
      
      Write-Output "SUCCESS"
    } catch {
      Write-Error $_.Exception.Message
    }
  `;

  // Create temporary script file to execute
  const tempScriptPath = path.join(__dirname, 'temp_automation.ps1');
  fs.writeFileSync(tempScriptPath, psScript, 'utf8');

  console.log(`Executing automation script for ${name} (${phone}) - PDF: ${pdfPath}`);

  // Run the script using -STA flag
  exec(`powershell -NoProfile -ExecutionPolicy Bypass -STA -File "${tempScriptPath}"`, (error, stdout, stderr) => {
    // Delete temp script file
    try {
      if (fs.existsSync(tempScriptPath)) fs.unlinkSync(tempScriptPath);
    } catch (err) {
      console.error('Failed to delete temp script file', err);
    }

    if (error) {
      console.error(`Automation execution failed: ${error.message}`);
      return res.status(500).json({ success: false, message: 'Automation execution failed', error: error.message });
    }

    if (stderr && !stdout.includes('SUCCESS')) {
      console.error(`Automation script error: ${stderr}`);
      return res.status(500).json({ success: false, message: 'Automation execution script error', error: stderr });
    }

    console.log(`Successfully prepared WhatsApp message for ${name}`);
    res.json({ success: true, message: 'WhatsApp automation prepared successfully' });
  });
});

app.post('/send-whatsapp-message', (req, res) => {
  const { phone, message, delay } = req.body;

  if (!phone || !message) {
    return res.status(400).json({ success: false, message: 'Missing phone or message' });
  }

  const automationDelay = parseInt(delay) || 3000;
  const escapedMessage = message.replace(/"/g, '`"').replace(/'/g, '`\'');

  const psScript = `
    try {
      # 1. Open WhatsApp to the customer's phone number
      Start-Process "whatsapp://send?phone=91${phone}"
      Start-Sleep -Milliseconds ${automationDelay}

      # 2. Copy the message to clipboard using .NET
      Add-Type -AssemblyName System.Windows.Forms
      [System.Windows.Forms.Clipboard]::SetText("${escapedMessage}")
      Start-Sleep -Milliseconds 500

      # 3. Focus WhatsApp, Paste (Ctrl+V) and Send (Enter)
      $wshell = New-Object -ComObject wscript.shell;
      $wshell.AppActivate('WhatsApp')
      Start-Sleep -Milliseconds 500
      $wshell.SendKeys('^v')
      Start-Sleep -Milliseconds 500
      $wshell.SendKeys('{ENTER}')
      Start-Sleep -Milliseconds 500
      
      Write-Output "SUCCESS"
    } catch {
      Write-Error $_.Exception.Message
    }
  `;

  const tempScriptPath = path.join(__dirname, 'temp_send_msg.ps1');
  fs.writeFileSync(tempScriptPath, psScript, 'utf8');

  console.log(`Executing message send automation for ${phone}`);

  exec(`powershell -NoProfile -ExecutionPolicy Bypass -STA -File "${tempScriptPath}"`, (error, stdout, stderr) => {
    try {
      if (fs.existsSync(tempScriptPath)) fs.unlinkSync(tempScriptPath);
    } catch (err) {
      console.error('Failed to delete temp script file', err);
    }

    if (error) {
      console.error(`Automation execution failed: ${error.message}`);
      return res.status(500).json({ success: false, message: 'Automation execution failed', error: error.message });
    }

    if (stderr && !stdout.includes('SUCCESS')) {
      console.error(`Automation script error: ${stderr}`);
      return res.status(500).json({ success: false, message: 'Automation execution script error', error: stderr });
    }

    console.log(`Successfully sent WhatsApp message to ${phone}`);
    res.json({ success: true, message: 'WhatsApp message sent successfully' });
  });
});

app.post('/send-whatsapp-broadcast', (req, res) => {
  const { phones, message, delay } = req.body;

  if (!phones || !Array.isArray(phones) || phones.length === 0 || !message) {
    return res.status(400).json({ success: false, message: 'Missing phones array or message' });
  }

  const automationDelay = parseInt(delay) || 4000;
  const escapedMessage = message.replace(/"/g, '`"').replace(/'/g, '`\'');
  
  const phoneList = phones.map(p => `"${p.trim()}"`).join(', ');

  const psScript = `
    try {
      # 1. Open WhatsApp to the share dialog with the message pre-loaded
      Start-Process "whatsapp://send?text=${escapedMessage}"
      Start-Sleep -Milliseconds ${automationDelay}

      $wshell = New-Object -ComObject wscript.shell;
      $wshell.AppActivate('WhatsApp')
      Start-Sleep -Milliseconds 1000

      # 2. Iterate through each phone number and check their box
      $phones = @(${phoneList})
      foreach ($phone in $phones) {
        # Focus/clear search input (Ctrl+A then Backspace)
        $wshell.SendKeys('^a')
        Start-Sleep -Milliseconds 300
        $wshell.SendKeys('{BACKSPACE}')
        Start-Sleep -Milliseconds 300

        # Type the phone number
        $wshell.SendKeys($phone)
        Start-Sleep -Milliseconds 2000  # wait for search results to appear

        # Select the contact: down arrow once, then spacebar to toggle checkbox
        $wshell.SendKeys('{DOWN}')
        Start-Sleep -Milliseconds 400
        $wshell.SendKeys(' ')
        Start-Sleep -Milliseconds 400
      }

      # 3. Complete broadcast: Send Keys to press green send arrow
      for ($i = 0; $i -lt 5; $i++) {
        $wshell.SendKeys('{TAB}')
        Start-Sleep -Milliseconds 200
      }
      $wshell.SendKeys('{ENTER}')
      Start-Sleep -Milliseconds 500

      Write-Output "SUCCESS"
    } catch {
      Write-Error $_.Exception.Message
    }
  `;

  const tempScriptPath = path.join(__dirname, 'temp_broadcast.ps1');
  fs.writeFileSync(tempScriptPath, psScript, 'utf8');

  console.log(`Executing multi-select broadcast automation for ${phones.length} recipients`);

  exec(`powershell -NoProfile -ExecutionPolicy Bypass -STA -File "${tempScriptPath}"`, (error, stdout, stderr) => {
    try {
      if (fs.existsSync(tempScriptPath)) fs.unlinkSync(tempScriptPath);
    } catch (err) {
      console.error('Failed to delete temp script file', err);
    }

    if (error) {
      console.error(`Automation execution failed: ${error.message}`);
      return res.status(500).json({ success: false, message: 'Automation execution failed', error: error.message });
    }

    if (stderr && !stdout.includes('SUCCESS')) {
      console.error(`Automation script error: ${stderr}`);
      return res.status(500).json({ success: false, message: 'Automation execution script error', error: stderr });
    }

    console.log(`Successfully completed automated broadcast to ${phones.length} contacts`);
    res.json({ success: true, message: 'WhatsApp broadcast completed successfully' });
  });
});

app.listen(PORT, () => {
  console.log(`🚀 Salon WhatsApp Automation Helper running on http://localhost:${PORT}`);
});
