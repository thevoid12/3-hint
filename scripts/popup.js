// popup.js with improved scraping
document.addEventListener('DOMContentLoaded', function() {
  const problemContent = document.getElementById('problemContent');
  const loading = document.getElementById('loading');
  const debug = document.getElementById('debug');

  function createRetryButton() {
    const button = document.createElement('button');
    button.textContent = 'Retry Loading';
    button.className = 'retry-button';
    button.onclick = scrapeProblemDetails;
    return button;
  }

  async function getCurrentTab() {
    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
    return tabs[0];
  }

  async function scrapeProblemDetails() {
    try {
      const tab = await getCurrentTab();
      
      if (!tab.url.includes('leetcode.com/problems/')) {
        loading.textContent = 'Please open a LeetCode problem page first.';
        loading.className = 'error';
        return;
      }

      const injectionResults = await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: () => {
          return new Promise((resolve) => {
            let attemptCount = 0;
            const maxAttempts = 50; // Increased attempts
            const debugInfo = [];

            function logDebug(msg) {
              debugInfo.push(`[Attempt ${attemptCount}] ${msg}`);
            }

            function extractContent() {
              attemptCount++;
              
              // Try all possible selectors for description
              const possibleDescriptionSelectors = [
                'div[data-track-load="description_content"]',
                '[class*="description-content"]',
                '[class*="_description_"]',
                '.content__u3I1',
                '.question-content__JfgR',
                '#problem-content',
                '.problems_problem_content__Xm_eO',
                '[data-cy="question-content"]'
              ];

              let descriptionElement = null;
              for (const selector of possibleDescriptionSelectors) {
                const element = document.querySelector(selector);
                if (element) {
                  descriptionElement = element;
                  logDebug(`Found description using selector: ${selector}`);
                  break;
                }
              }

              // Get title using multiple selectors
              const titleElement = 
                document.querySelector('[data-cy="question-title"]') ||
                document.querySelector('.mr-2.text-lg.font-medium') ||
                document.querySelector('[class*="title"]');
                if (titleElement) {
                  logDebug('Found title element');
                }

              const difficultyElement = 
                document.querySelector('[diff]') ||
                document.querySelector('.bg-olive') ||
                document.querySelector('[class*="difficulty"]');

              if (titleElement) {
                logDebug('Found title element');
              }

              if (difficultyElement) {
                logDebug('Found difficulty element');
              }

              // Only proceed if we have at least a title or description
              if (titleElement || descriptionElement) {
                const data = {
                  title: titleElement ? titleElement.textContent.trim() : 'Title not found',
                  difficulty: difficultyElement ? difficultyElement.textContent.trim() : 'Unknown',
                  description: descriptionElement ? descriptionElement.innerHTML : 'Description not found',
                  debugInfo: debugInfo.join('\n')
                };

                logDebug('Successfully collected data');
                resolve(data);
              } else {
                logDebug('Required elements not found yet');
                
                if (attemptCount < maxAttempts) {
                  setTimeout(extractContent, 200);
                } else {
                  logDebug('Max attempts reached');
                  resolve({
                    title: 'Content not loaded',
                    difficulty: 'Unknown',
                    description: 'Failed to load content',
                    debugInfo: debugInfo.join('\n')
                  });
                }
              }
            }

            extractContent();
          });
        }
      });

      const result = injectionResults[0].result;

      loading.style.display = 'none';
      
      // Display the content
      problemContent.innerHTML = `
        <div class="header">
          <span class="title">${result.title}</span>
          <span class="difficulty">${result.difficulty}</span>
        </div>
        <div class="description">
          ${result.description}
        </div>
      `;

      // Show debug info
      debug.innerHTML = `<pre>${result.debugInfo}</pre>`;

    } catch (error) {
      loading.textContent = 'Error loading problem details. Please try again.';
      loading.className = 'error';
      const retryButton = createRetryButton();
      loading.appendChild(document.createElement('br'));
      loading.appendChild(retryButton);
      console.error('Error:', error);
    }
  }

  scrapeProblemDetails();
});
