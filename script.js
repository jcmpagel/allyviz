document.addEventListener('DOMContentLoaded', () => {
    // Grabbing elements from the DOM and storing them in variables for later use
    const urlInput = document.getElementById('urlInput');
    const checkButton = document.getElementById('checkAccessibilityBtn');
    const loadingSymbol = document.getElementById('loadingSymbol');
    const estimatedTime = document.getElementById('estimatedTime');
    const screenshotImg = document.getElementById('screenshot');
    const screenshotWrapper = document.querySelector('.screenshot-wrapper');
    const auditSection = document.getElementById('auditSection');
    const globalTooltip = document.getElementById('globalTooltip');
    let factRotationInterval;


    function normalizeUrl(inputUrl) {
        let url = inputUrl.trim();
        // Adding "https://" if it's missing
        if (!url.match(/^[a-zA-Z]+:\/\//)) {
            url = "https://" + url;
        }
        // Removing "www." if present
        url = url.replace(/^www\./, '');
        return url;
    }

    // Function to retrieve a specific query parameter value from the URL
    function getQueryParameter(name) {
        const results = new RegExp('[\\?&]' + name + '=([^&#]*)').exec(window.location.href);
        if (results == null) {
            return null;
        }
        return decodeURIComponent(results[1]) || null;
    }

    // Function to clear all overlay elements from the page
    function clearOverlays() {
        document.querySelectorAll('.overlay').forEach(overlay => overlay.remove());
    }

    // Load a default report from a local JSON file and handle it appropriately
    function loadDefaultReport() {
        fetch('report.json')
            .then(response => response.json())
            .then(data => {
                // Check if the necessary data is available in the JSON response
                if (data.lighthouseResult && data.lighthouseResult.fullPageScreenshot) {
                    const screenshotData = data.lighthouseResult.fullPageScreenshot.screenshot.data;
                    console.log('Default screenshot data retrieved:', screenshotData);
                    positionOverlays(data.lighthouseResult.fullPageScreenshot.screenshot, data.lighthouseResult.audits);
                } else {
                    // If the expected data isn't present, throw an error
                    throw new Error('No default lighthouse results available.');
                }
            })
            .catch(error => {
                // Log errors to the console and show a message if the report can't be loaded
                console.error('Error loading the default report:', error);
                displayNoAuditsMessage();
            })
            .finally(() => {
                // Hide the loading symbol once the report is loaded or fails to load
                hideLoading();
            });
    }
    const accessibilityFacts = [
        "86.4% of home pages have low contrast text.",
        "62% of U.S. adults with a disability say they own a desktop or laptop computer, compared with 81% of those without a disability.",
        "An estimated 1.3 billion people – or 1 in 6 people worldwide – experience significant disability.",
        "89.1% of web accessibility practitioners indicated that better web sites would have a bigger impact on accessibility than better assistive technology and browsers in 2021.",
        "15% of disabled people say they 'never' go online."  // Changed to single quotes
    ];
/**
 * Randomly selects an accessibility fact from the list and updates the loading symbol's text content with it.
 */
function rotateAccessibilityFacts() {
    // Randomly select an index from the accessibilityFacts array
    const factsIndex = Math.floor(Math.random() * accessibilityFacts.length);
    // Retrieve the fact text using the randomly selected index
    const factText = accessibilityFacts[factsIndex];
    // Get the current text of the loading symbol element
    const loadingText = document.getElementById('loadingSymbol').textContent;
    // Update the loading symbol's text content with the selected fact
    document.getElementById('accessibilityFacts').textContent = factText;
}

/**
 * Displays a tooltip with the specified content at the given coordinates.
 * @param {string} content - The HTML content to display inside the tooltip.
 * @param {number} x - The horizontal coordinate where the tooltip should appear.
 * @param {number} y - The vertical coordinate where the tooltip should appear.
 */
function showTooltip(content, x, y) {
    // Set the HTML content of the global tooltip
    globalTooltip.innerHTML = adjustExplanationWithColors(content);
    // Position the tooltip according to the specified coordinates
    globalTooltip.style.left = `${x}px`;
    globalTooltip.style.top = `${y}px`;
    // Make the tooltip visible
    globalTooltip.style.visibility = 'visible';
}

/**
 * Hides the loading symbol and displays the screenshot and audit sections.
 */
function hideLoading() {
    // Hide the loading symbol and estimated time elements
    loadingSymbol.style.display = 'none';
    estimatedTime.style.display = 'none';
    // Show the screenshot wrapper and audit section elements
    screenshotWrapper.style.display = 'block';
    auditSection.style.display = 'block';
    
    // Stop rotating the accessibility facts
    clearInterval(factRotationInterval);
}

/**
 * Displays a message indicating that no accessibility audits found any issues.
 */
function displayNoAuditsMessage() {
    // Set the innerHTML of the auditSection to display a success message
    auditSection.innerHTML = '<div class="audit-detail"><h3>Good news!</h3><p>No accessibility issues found on this page.</p></div>';
}

/**
 * Determine severity class based on audit details
 * @param {Object} audit - The audit object
 * @return {string} - The severity class (critical, serious, moderate, minor)
 */
function determineSeverity(audit) {
    const auditId = audit.id || '';
    const auditTitle = audit.title?.toLowerCase() || '';
    
    // Critical issues
    if (
        auditTitle.includes('contrast') || 
        auditId.includes('color-contrast') || 
        auditTitle.includes('keyboard') || 
        auditId.includes('keyboard') ||
        auditTitle.includes('alt text') || 
        auditId.includes('alt-text') ||
        auditTitle.includes('html lang') || 
        auditId.includes('html-lang')
    ) {
        return 'critical';
    }
    
    // Serious issues
    else if (
        auditTitle.includes('aria') || 
        auditId.includes('aria') || 
        auditTitle.includes('heading') || 
        auditId.includes('heading') ||
        auditTitle.includes('label') || 
        auditId.includes('label')
    ) {
        return 'serious';
    }
    
    // Moderate issues
    else if (
        auditTitle.includes('focus') || 
        auditId.includes('focus') || 
        auditTitle.includes('semantic') || 
        auditId.includes('semantic') ||
        auditTitle.includes('structure') || 
        auditId.includes('structure')
    ) {
        return 'moderate';
    }
    
    // Default to minor
    else {
        return 'minor';
    }
}

/**
 * Adds an event listener to the screenshot wrapper to display tooltips on mouse move.
 */
screenshotWrapper.addEventListener('mousemove', (e) => {
    let tooltipShown = false;
    
    document.querySelectorAll('.overlay').forEach(overlay => {
        const rect = overlay.getBoundingClientRect();
        
        // Check if the mouse is over this overlay
        if (e.clientX >= rect.left && e.clientX <= rect.right && 
            e.clientY >= rect.top && e.clientY <= rect.bottom) {
            
            // Get the explanation and show tooltip
            const explanation = overlay.getAttribute('data-explanation');
            if (explanation) {
                showTooltip(explanation, e.clientX + 10, e.clientY + 10);
                tooltipShown = true;
                
                // Highlight the active overlay
                overlay.style.zIndex = '30'; // Bring to front
                overlay.style.backgroundColor = 'rgba(37, 99, 235, 0.2)';
            }
        } else {
            // Reset overlay styling when not hovered
            overlay.style.zIndex = '20';
            
            // Restore original background color based on class
            if (overlay.classList.contains('critical')) {
                overlay.style.backgroundColor = 'rgba(239, 68, 68, 0.15)';
            } else if (overlay.classList.contains('serious')) {
                overlay.style.backgroundColor = 'rgba(245, 158, 11, 0.15)';
            } else if (overlay.classList.contains('moderate')) {
                overlay.style.backgroundColor = 'rgba(234, 179, 8, 0.15)';
            } else {
                overlay.style.backgroundColor = 'rgba(102, 102, 102, 0.1)';
            }
        }
    });
    
    if (!tooltipShown) {
        globalTooltip.style.visibility = 'hidden';
    }
});

// Attempt to fetch a page report automatically based on the URL query parameter
const pageUrlFromQuery = getQueryParameter('url');
if (pageUrlFromQuery) {
    // If a URL is provided, display it in the URL input field and fetch its page speed data
    urlInput.value = pageUrlFromQuery;
    fetchPageSpeedData(pageUrlFromQuery);
} else {
    // If no URL parameter is provided, load the default report on initial page load
    loadDefaultReport();
}

    // Function to fetch PageSpeed data
    function fetchPageSpeedData(pageUrl) {
        clearOverlays();
        screenshotWrapper.style.display = 'none';
        auditSection.innerHTML = '';
        loadingSymbol.style.display = 'flex'; // Changed to flex to ensure proper alignment
        estimatedTime.style.display = 'block';
        estimatedTime.classList.add('active');
        
        // Start rotating accessibility facts
        rotateAccessibilityFacts(); // Show the first fact immediately
        factRotationInterval = setInterval(rotateAccessibilityFacts, 9000); 
        
        const startTime = Date.now();
        const finishTime = new Date(startTime + 90000); // 90 seconds from now
        estimatedTime.textContent = `Analyzing Webpage the estimated finish time is: ${finishTime.toLocaleTimeString()}`;
        
    // With this new API endpoint:
    const apiUrl = `https://allyviz-api.jcmpagel.workers.dev/?url=${encodeURIComponent(pageUrl)}`;
    
    console.log(`Fetching: ${apiUrl}`);
        
        fetch(apiUrl)
            .then(response => {
                console.log('API response status:', response.status);
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                return response.json();
            })
            .then(data => {
                console.log('Data received, has lighthouse result:', !!data.lighthouseResult);
                console.log('Has full page screenshot:', !!(data.lighthouseResult && data.lighthouseResult.fullPageScreenshot));
                
                if (data.lighthouseResult && data.lighthouseResult.fullPageScreenshot) {
                    const screenshotData = data.lighthouseResult.fullPageScreenshot.screenshot.data;
                    console.log('Screenshot data retrieved:', screenshotData.substring(0, 50) + '...');
                    positionOverlays(data.lighthouseResult.fullPageScreenshot.screenshot, data.lighthouseResult.audits);
                } else {
                    throw new Error('No lighthouse results available.');
                }
            })
            .catch(error => {
                console.error('Error during fetch operation:', error);
                displayNoAuditsMessage();
            })
            .finally(() => {
                hideLoading();
            });
    }
    urlInput.addEventListener('keypress', function(event) {
        if (event.key === 'Enter') {
            event.preventDefault(); // Prevent the default form submit action if in a form
            checkButton.click();
        }
    });

    checkButton.addEventListener('click', () => {
        let pageUrl = urlInput.value.trim();
        if (!pageUrl) {
            alert('Please enter a URL.');
            return;
        }
    
        // Normalize the URL
        pageUrl = normalizeUrl(pageUrl);
    
        updateBrowserUrl(pageUrl);
        fetchPageSpeedData(pageUrl);
    });

// Function to update the browser's URL with the encoded page URL as a query parameter
function updateBrowserUrl(pageUrl) {
    const encodedUrl = encodeURIComponent(pageUrl);
    const newUrl = `${window.location.origin}${window.location.pathname}?url=${encodedUrl}`;
    history.pushState({path: newUrl}, '', newUrl);
    // This will update the URL in the browser's address bar without reloading the page
    // and make it easy for users to share the link.
}
    
function positionOverlays(screenshot, audits) {
    console.log('Positioning overlays...');
    screenshotImg.onload = function() {
        console.log('Screenshot loaded with dimensions:', screenshotImg.width, 'x', screenshotImg.height);
        
        // Wait a bit to ensure image is fully rendered before calculating scale
        setTimeout(() => {
            const scaleX = screenshotImg.offsetWidth / screenshot.width;
            const scaleY = screenshotImg.offsetHeight / screenshot.height;
            
            console.log('Scale factors:', scaleX, scaleY);
            console.log('Screenshot dimensions:', screenshot.width, 'x', screenshot.height);
            console.log('Image display dimensions:', screenshotImg.offsetWidth, 'x', screenshotImg.offsetHeight);

            Object.keys(audits).forEach(auditKey => {
                const audit = audits[auditKey];
                if (audit.score !== 1 && audit.scoreDisplayMode === 'binary') {
                    // Determine severity for this audit
                    const severity = determineSeverity(audit);
                    
                    let auditElem = auditSection.querySelector(`#audit-${auditKey}`);
                    if (!auditElem) {
                        auditElem = document.createElement('div');
                        auditElem.id = `audit-${auditKey}`;
                        auditElem.classList.add('audit-detail');
                        auditElem.setAttribute('data-severity', severity);

                        const updatedDescription = audit.description.replace(/\[Learn[^\]]+\]\(https?:\/\/[^\)]+\)\.?\s*/g, '').trim();
                        auditElem.innerHTML = `<h3>${audit.title} <span class="count"></span> <span class="color-box ${severity}-indicator"></span></h3><p>${updatedDescription}</p>
                        ${audit.description.includes('http') ? `<a href="${audit.description.match(/\(https:\/\/[^)]+\)/)[0].slice(1, -1)}" target="_blank">Learn more</a>` : ''}`;

                        // Create the itemList
                        const itemList = document.createElement('ul');
                        itemList.classList.add('details-list');

                        const toggleButton = document.createElement('button');
                        toggleButton.innerText = 'Hide Details/Overlays';
                        toggleButton.setAttribute('aria-expanded', 'true');
                        
                        // Append the toggle button
                        auditElem.appendChild(toggleButton);

                        if (audit.details && audit.details.items) {
                            let itemCount = 0;
                            audit.details.items.forEach(item => {
                                if (item.node && item.node.boundingRect) {
                                    itemCount++;
                                    const itemElem = document.createElement('li');
                                    itemElem.classList.add('item-detail');
                                    itemElem.innerHTML = `<strong>Error:</strong> <span class="breakable-text">${item.node.explanation}</span>
                                    <br><strong>Selector:</strong> <span class="breakable-text">${item.node.selector}</span>
                                    <br><strong>Path:</strong> <span class="breakable-text">${item.node.path}</span>`;
                                    if (item.node.snippet) {
                                        const codeElem = document.createElement('code');
                                        codeElem.classList.add('breakable-text', 'snippet-code');
                                        codeElem.textContent = item.node.snippet;
                                        const snippetContainer = document.createElement('p');
                                        snippetContainer.appendChild(document.createTextNode('Snippet: '));
                                        snippetContainer.appendChild(codeElem);
                                        itemElem.appendChild(snippetContainer);
                                    }
                                    itemList.appendChild(itemElem);
                                }
                            });
                            
                            // Update count display
                            const countSpan = auditElem.querySelector('.count');
                            if (countSpan) {
                                countSpan.textContent = `${itemCount} issue${itemCount !== 1 ? 's' : ''}`;
                            }
                            
                            auditElem.appendChild(itemList);
                        }

                        auditSection.appendChild(auditElem);

                        toggleButton.addEventListener('click', function() {
                            const overlays = document.querySelectorAll(`.overlay[data-audit="${auditKey}"]`);
                            const isHidden = toggleButton.innerText.includes('Show');
                            
                            overlays.forEach(overlay => {
                                isHidden ? overlay.classList.remove('hidden') : overlay.classList.add('hidden');
                            });
                            
                            const expanded = toggleButton.getAttribute('aria-expanded') === 'true';
                            toggleButton.setAttribute('aria-expanded', !expanded);
                            toggleButton.innerText = isHidden ? 'Hide Details/Overlays' : 'Show Details/Overlays';
                            
                            if (!isHidden) {
                                itemList.classList.add('collapsed');
                            } else {
                                itemList.classList.remove('collapsed');
                            }
                        });
                    }

                    if (audit.details && audit.details.items) {
                        audit.details.items.forEach(item => {
                            if (item.node && item.node.boundingRect) {
                                const overlay = document.createElement('div');
                                overlay.className = 'overlay';
                                
                                // Add severity class
                                overlay.classList.add(severity);
                                overlay.setAttribute('data-severity', severity);
                                
                                overlay.setAttribute('data-audit', auditKey);
                                overlay.style.width = `${item.node.boundingRect.width * scaleX}px`;
                                overlay.style.height = `${item.node.boundingRect.height * scaleY}px`;
                                overlay.style.left = `${item.node.boundingRect.left * scaleX}px`;
                                overlay.style.top = `${item.node.boundingRect.top * scaleY}px`;
                                let adjustedExplanation = item.node.explanation.replace('Fix any of the following:', '').trim();
                                overlay.setAttribute('data-explanation', adjustedExplanation);
                                overlay.setAttribute('data-selector', item.node.selector);
                                overlay.setAttribute('role', 'button');
                                overlay.setAttribute('aria-label', `Accessibility issue: ${adjustedExplanation}`);
                                screenshotWrapper.appendChild(overlay);
                            }
                        });
                    }
                }
            });

            const failedAudits = Object.keys(audits).some(key => audits[key].score !== 1 && audits[key].scoreDisplayMode === 'binary');
            if (!failedAudits) {
                displayNoAuditsMessage();
            }
            
            // Show the screenshot and wrapper
            screenshotWrapper.style.display = 'block';
            
        }, 100); // Small delay to ensure the image is fully loaded
    };

    // Set the source of the screenshot image
    screenshotImg.src = `${screenshot.data}`;
    console.log('Set screenshot src:', screenshotImg.src.substring(0, 50) + '...');
}
    
function adjustExplanationWithColors(text) {
    // Regular expression to find hex codes
    const hexCodeRegex = /#[0-9a-fA-F]{6}|#[0-9a-fA-F]{3}/g;
    return text.replace(hexCodeRegex, (match) => {
        return `${match} <span class="color-box" style="background-color: ${match};"></span>`;
    });
}
    
});

document.getElementById('toggleAllOverlays').addEventListener('click', function() {
    const overlays = document.querySelectorAll('.overlay');
    const isAnyVisible = Array.from(overlays).some(overlay => !overlay.classList.contains('hidden'));
    
    overlays.forEach(overlay => {
        if (isAnyVisible) {
            overlay.classList.add('hidden');
        } else {
            overlay.classList.remove('hidden');
        }
    });
    
    this.textContent = isAnyVisible ? 'Show All Overlays' : 'Hide All Overlays';
});

document.getElementById('filterIssues').addEventListener('change', function() {
    const selectedValue = this.value;
    console.log('Filter changed to:', selectedValue);
    
    const overlays = document.querySelectorAll('.overlay');
    console.log('Total overlays:', overlays.length);
    
    let visibleCount = 0;
    
    overlays.forEach(overlay => {
        const severity = overlay.getAttribute('data-severity');
        
        if (selectedValue === 'all' || severity === selectedValue) {
            overlay.classList.remove('hidden');
            visibleCount++;
        } else {
            overlay.classList.add('hidden');
        }
    });
    
    console.log('Visible overlays after filtering:', visibleCount);
    
    // Update the audit section items
    const auditItems = document.querySelectorAll('.audit-detail');
    auditItems.forEach(item => {
        const severity = item.getAttribute('data-severity');
        if (selectedValue === 'all' || severity === selectedValue) {
            item.style.display = 'block';
        } else {
            item.style.display = 'none';
        }
    });
});