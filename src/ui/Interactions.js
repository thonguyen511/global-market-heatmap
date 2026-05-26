import { marketDots } from '../objects/Markets.js';
import { earthGroup } from '../objects/Earth.js';

const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();

const tvContainer = document.getElementById('tradingview-container');
const heatmapOverlay = document.getElementById('heatmap-overlay');
const tooltip = document.getElementById('market-tooltip');

export let targetCameraX = 0;
export let isEarthPaused = false;

let isHeatmapPinned = false;
let autoCloseTimeout = null;
let hoverDebounce = null;
let currentHoveredMarket = null;

function showHeatmap(market) {
    heatmapOverlay.classList.remove('hidden');
    document.getElementById('heatmap-title').innerText = market.name;
    
    targetCameraX = 400; 
    
    Array.from(tvContainer.children).forEach(child => child.style.display = 'none');

    const widgetId = 'tv-widget-' + market.code;
    let widgetWrapper = document.getElementById(widgetId);

    if (!widgetWrapper) {
        widgetWrapper = document.createElement('div');
        widgetWrapper.id = widgetId;
        widgetWrapper.style.width = '100%';
        widgetWrapper.style.height = '100%';
        
        const iframe = document.createElement('iframe');
        iframe.style.width = '100%';
        iframe.style.height = '100%';
        iframe.style.border = 'none';
        widgetWrapper.appendChild(iframe);
        
        tvContainer.appendChild(widgetWrapper);

        const tvConfig = {
            "dataSource": market.code,
            "blockSize": "market_cap_basic",
            "blockColor": "change",
            "grouping": "no_group",
            "locale": "en",
            "symbolUrl": "",
            "colorTheme": "dark",
            "hasTopBar": false,
            "isDataSetEnabled": false,
            "isZoomEnabled": true,
            "hasSymbolTooltip": true,
            "isMonoSize": false,
            "width": "100%",
            "height": "100%"
        };

        const iframeDoc = iframe.contentWindow.document;
        iframeDoc.open();
        iframeDoc.write(`
            <html>
            <head><style>body { margin: 0; overflow: hidden; background-color: #0f0f19; }</style></head>
            <body>
                <div class="tradingview-widget-container">
                    <div class="tradingview-widget-container__widget"></div>
                    <script type="text/javascript" src="https://s3.tradingview.com/external-embedding/embed-widget-stock-heatmap.js" async>
                    ${JSON.stringify(tvConfig)}
                    </script>
                </div>
            </body>
            </html>
        `);
        iframeDoc.close();
    } else {
        widgetWrapper.style.display = 'block';
    }
}

function closeHeatmap() {
    heatmapOverlay.classList.add('hidden');
    currentHoveredMarket = null;
    targetCameraX = 0; 
}

export function initInteractions(camera) {
    document.getElementById('close-heatmap').addEventListener('click', () => {
        isHeatmapPinned = false;
        clearTimeout(autoCloseTimeout);
        closeHeatmap();
    });

    window.addEventListener('mousemove', (event) => {
        mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
        mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

        raycaster.setFromCamera(mouse, camera);
        const intersects = raycaster.intersectObjects(marketDots);

        if (intersects.length > 0) {
            const dot = intersects[0].object;
            const market = dot.userData;
            
            tooltip.innerText = `${market.name} (${market.isOpen ? "OPEN" : "CLOSED"})`;
            tooltip.style.left = (event.clientX + 15) + 'px';
            tooltip.style.top = (event.clientY + 15) + 'px';
            tooltip.classList.remove('hidden');
            
            if (!isHeatmapPinned) {
                if (currentHoveredMarket !== market.code) {
                    clearTimeout(hoverDebounce);
                    hoverDebounce = setTimeout(() => {
                        showHeatmap(market);
                        currentHoveredMarket = market.code;
                    }, 150);
                }
                
                clearTimeout(autoCloseTimeout);
                autoCloseTimeout = setTimeout(() => {
                    if (!isHeatmapPinned) {
                        closeHeatmap();
                    }
                }, 15000);
            }
        } else {
            tooltip.classList.add('hidden');
        }
    });

    window.addEventListener('click', (event) => {
        if (event.target.closest('#heatmap-overlay')) return;

        raycaster.setFromCamera(mouse, camera);
        const intersects = raycaster.intersectObjects(marketDots);

        if (intersects.length > 0) {
            const dot = intersects[0].object;
            const market = dot.userData;
            
            isHeatmapPinned = true;
            clearTimeout(autoCloseTimeout);
            clearTimeout(hoverDebounce);
            
            showHeatmap(market);
            currentHoveredMarket = market.code;
        }
    });

    window.addEventListener('contextmenu', (event) => {
        event.preventDefault();
        raycaster.setFromCamera(mouse, camera);
        const intersects = raycaster.intersectObjects(earthGroup.children, true);
        if (intersects.length > 0) {
            isEarthPaused = !isEarthPaused;
        }
    });
}
