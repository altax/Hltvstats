import puppeteer from "puppeteer-core";
import * as fs from "fs";
import * as path from "path";

const DEMOS_DIR = path.join(process.cwd(), "demos");

if (!fs.existsSync(DEMOS_DIR)) {
  fs.mkdirSync(DEMOS_DIR, { recursive: true });
}

async function getBrowser() {
  return puppeteer.launch({
    executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || "/nix/store/qa9cnw4v5xkxyip6mb9kxqfq1z4x2dx1-chromium-138.0.7204.100/bin/chromium",
    headless: true,
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-dev-shm-usage",
      "--disable-gpu",
    ],
  });
}

export async function getDemoLinkFromMatch(matchUrl: string): Promise<string | null> {
  const browser = await getBrowser();
  try {
    const page = await browser.newPage();
    await page.setUserAgent(
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
    );
    
    console.log(`[Demo] Loading match page: ${matchUrl}`);
    await page.goto(matchUrl, { waitUntil: "networkidle2", timeout: 60000 });
    
    // Wait a bit for dynamic content
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    const result = await page.evaluate(() => {
      const links = Array.from(document.querySelectorAll("a"));
      const allHrefs: string[] = [];
      
      for (const link of links) {
        if (link.href) {
          allHrefs.push(link.href);
          // Check for demo download link
          if (link.href.includes("/download/demo/")) {
            return { demoLink: link.href, debug: allHrefs.slice(0, 10) };
          }
        }
      }
      
      // Also check for any elements with "demo" text
      const demoElements = document.querySelectorAll('[class*="demo"], [data-demo], .stream-box');
      const demoInfo: string[] = [];
      demoElements.forEach(el => {
        demoInfo.push(el.outerHTML.substring(0, 200));
      });
      
      // Check page title to see if we're on the right page
      const title = document.title;
      const bodyText = document.body.innerText.substring(0, 500);
      
      return { 
        demoLink: null, 
        debug: allHrefs.slice(0, 20),
        demoInfo,
        title,
        bodyPreview: bodyText
      };
    });
    
    console.log(`[Demo] Page title: ${result.title}`);
    console.log(`[Demo] Found demo link: ${result.demoLink}`);
    if (!result.demoLink) {
      console.log(`[Demo] Links on page:`, result.debug);
      console.log(`[Demo] Body preview:`, result.bodyPreview?.substring(0, 200));
    }
    
    return result.demoLink;
  } catch (error) {
    console.error(`[Demo] Error getting demo link: ${error}`);
    return null;
  } finally {
    await browser.close();
  }
}

export async function downloadDemo(demoUrl: string, filename: string): Promise<string | null> {
  const browser = await getBrowser();
  try {
    const page = await browser.newPage();
    await page.setUserAgent(
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
    );
    
    // Set up download behavior via CDP
    const client = await page.createCDPSession();
    await client.send("Page.setDownloadBehavior", {
      behavior: "allow",
      downloadPath: DEMOS_DIR,
    });
    
    console.log(`[Demo] Navigating to download URL: ${demoUrl}`);
    
    // Navigate to the download URL - this will trigger the download
    await page.goto(demoUrl, { waitUntil: "networkidle0", timeout: 120000 }).catch(() => {
      // Navigation might "fail" because it's a download, not a page
      console.log("[Demo] Navigation completed (download triggered)");
    });
    
    // Wait for the download to complete by checking for files in the directory
    console.log("[Demo] Waiting for download to complete...");
    
    let downloadedFile: string | null = null;
    const startTime = Date.now();
    const timeout = 120000; // 2 minutes max wait
    
    while (Date.now() - startTime < timeout) {
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      const files = fs.readdirSync(DEMOS_DIR);
      // Look for .rar or .zip files that are not .crdownload (partial downloads)
      for (const file of files) {
        const filePath = path.join(DEMOS_DIR, file);
        if ((file.endsWith(".rar") || file.endsWith(".zip")) && !file.endsWith(".crdownload")) {
          const stats = fs.statSync(filePath);
          // Check if file is not being written to (size stable)
          await new Promise(resolve => setTimeout(resolve, 1000));
          const stats2 = fs.statSync(filePath);
          if (stats.size === stats2.size && stats.size > 1000) {
            downloadedFile = filePath;
            break;
          }
        }
      }
      
      if (downloadedFile) break;
      console.log("[Demo] Still downloading...");
    }
    
    if (downloadedFile) {
      const stats = fs.statSync(downloadedFile);
      console.log(`[Demo] Downloaded: ${downloadedFile} (${stats.size} bytes)`);
      
      // Rename to the requested filename if different
      const targetPath = path.join(DEMOS_DIR, filename);
      if (downloadedFile !== targetPath) {
        fs.renameSync(downloadedFile, targetPath);
        console.log(`[Demo] Renamed to: ${targetPath}`);
        return targetPath;
      }
      return downloadedFile;
    }
    
    console.error("[Demo] Download timed out");
    return null;
  } catch (error) {
    console.error(`[Demo] Error downloading: ${error}`);
    return null;
  } finally {
    await browser.close();
  }
}

export async function testDemoDownload(matchUrl: string): Promise<{ demoLink: string | null; downloaded: boolean; filePath?: string }> {
  const matchId = matchUrl.split("/matches/")[1]?.split("/")[0] || "unknown";
  const filename = `demo_${matchId}.rar`;
  
  // Combined approach: navigate to match page, set up download, click the link
  const browser = await getBrowser();
  try {
    const page = await browser.newPage();
    await page.setUserAgent(
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
    );
    
    // Set up download behavior via CDP BEFORE navigating
    const client = await page.createCDPSession();
    await client.send("Page.setDownloadBehavior", {
      behavior: "allow",
      downloadPath: DEMOS_DIR,
    });
    
    console.log(`[Demo] Loading match page: ${matchUrl}`);
    await page.goto(matchUrl, { waitUntil: "networkidle2", timeout: 60000 });
    
    // Wait for page to fully load
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // Find and click the demo download link
    const demoLink = await page.evaluate(() => {
      const links = Array.from(document.querySelectorAll("a"));
      for (const link of links) {
        if (link.href && link.href.includes("/download/demo/")) {
          return link.href;
        }
      }
      return null;
    });
    
    if (!demoLink) {
      console.log("[Demo] No demo link found on page");
      return { demoLink: null, downloaded: false };
    }
    
    console.log(`[Demo] Found demo link: ${demoLink}`);
    console.log(`[Demo] Clicking download link...`);
    
    // Click the link to trigger download
    await page.click(`a[href*="/download/demo/"]`);
    
    // Wait for download to complete
    console.log("[Demo] Waiting for download to complete...");
    
    let downloadedFile: string | null = null;
    const startTime = Date.now();
    const timeout = 180000; // 3 minutes max wait
    
    while (Date.now() - startTime < timeout) {
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      const files = fs.readdirSync(DEMOS_DIR);
      console.log(`[Demo] Files in demos folder: ${files.join(", ") || "(empty)"}`);
      
      for (const file of files) {
        const filePath = path.join(DEMOS_DIR, file);
        // Check for .rar, .zip, or .dem files (not partial downloads)
        if ((file.endsWith(".rar") || file.endsWith(".zip") || file.endsWith(".dem")) && 
            !file.endsWith(".crdownload") && !file.endsWith(".tmp")) {
          const stats = fs.statSync(filePath);
          if (stats.size > 1000) {
            // Wait a bit and check if size is stable (download complete)
            await new Promise(resolve => setTimeout(resolve, 2000));
            const stats2 = fs.statSync(filePath);
            if (stats.size === stats2.size) {
              downloadedFile = filePath;
              break;
            }
          }
        }
      }
      
      if (downloadedFile) break;
      console.log("[Demo] Still downloading...");
    }
    
    if (downloadedFile) {
      const stats = fs.statSync(downloadedFile);
      console.log(`[Demo] Downloaded: ${downloadedFile} (${stats.size} bytes)`);
      
      // Rename to expected filename
      const targetPath = path.join(DEMOS_DIR, filename);
      if (downloadedFile !== targetPath) {
        fs.renameSync(downloadedFile, targetPath);
        console.log(`[Demo] Renamed to: ${targetPath}`);
        return { demoLink, downloaded: true, filePath: targetPath };
      }
      return { demoLink, downloaded: true, filePath: downloadedFile };
    }
    
    console.error("[Demo] Download timed out");
    return { demoLink, downloaded: false };
  } catch (error) {
    console.error(`[Demo] Error: ${error}`);
    return { demoLink: null, downloaded: false };
  } finally {
    await browser.close();
  }
}
