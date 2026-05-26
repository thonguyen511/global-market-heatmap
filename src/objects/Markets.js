export const marketDots = [];

function latLonToVector3(lat, lon, radius) {
    const phi = (90 - lat) * (Math.PI / 180);
    const theta = (lon + 180) * (Math.PI / 180);

    const x = -(radius * Math.sin(phi) * Math.cos(theta));
    const z = (radius * Math.sin(phi) * Math.sin(theta));
    const y = (radius * Math.cos(phi));

    return new THREE.Vector3(x, y, z);
}

export function initMarkets(earthGroup) {
    const dotGeometry = new THREE.SphereGeometry(0.012, 16, 16);
    const closedMaterial = new THREE.MeshBasicMaterial({ color: 0xff0000 });
    
    fetch('assets/geo/markets.json')
        .then(res => res.json())
        .then(data => {
            data.forEach(market => {
                const dot = new THREE.Mesh(dotGeometry, closedMaterial.clone());
                const position = latLonToVector3(market.lat, market.lon, 1.008);
                dot.position.copy(position);
                dot.userData = market;
                earthGroup.add(dot);
                marketDots.push(dot);
            });
        });
}

export function updateMarketColors(currentUTCFloat) {
    marketDots.forEach(dot => {
        const market = dot.userData;
        let isOpen = false;
        
        if (market.openUTC > market.closeUTC) {
            isOpen = (currentUTCFloat >= market.openUTC || currentUTCFloat <= market.closeUTC);
        } else {
            isOpen = (currentUTCFloat >= market.openUTC && currentUTCFloat <= market.closeUTC);
        }
        
        market.isOpen = isOpen;
        dot.material.color.setHex(isOpen ? 0x00ff00 : 0xff0000);
    });
}
