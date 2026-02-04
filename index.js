(
    async function () {
        const container = document.querySelector('#eur-current');
        const response = await fetch('https://api.nbp.pl/api/exchangerates/rates/A/EUR?format=json');
        const data = await response.json();
        if (container) {
            container.innerHTML = `${data.code.toUpperCase()}: ${data.rates[0].mid}`;
        }
    }
)();
(
    async function () {
        const container = document.querySelector('#usd-current');
        const response = await fetch('https://api.nbp.pl/api/exchangerates/rates/A/USD?format=json');
        const data = await response.json();
        if (container) {
            container.innerHTML = `${data.code.toUpperCase()}: ${data.rates[0].mid}`;
        }
    }
)();

const DATA_COUNT = 93;
const colorMapBorders = { EUR: '#003399', USD: '#6B8068' };
const colorMapbBack = { EUR: '#737373', USD: '#B2B2B2' };
const getLabels = (data) => { return data.rates.map(rate => rate.effectiveDate) };
(async function () {
    const responces = await Promise.all([
        fetch(`https://api.nbp.pl/api/exchangerates/rates/A/USD//last/${DATA_COUNT}?format=json`),
        fetch(`https://api.nbp.pl/api/exchangerates/rates/A/EUR//last/${DATA_COUNT}?format=json`)
    ]);
    const data = responces.map(
        async (res) => await res.json()
    );
    const currencies = await Promise.all(data);
    const labels = currencies.map(getLabels)[0];
    const datasets = currencies.reduce((acc, currRaw) => {
        const curr = {
            label: currRaw.code,
            data: currRaw.rates.map(rate => rate.mid),
            borderColor: colorMapBorders[currRaw.code],
            backgroundColor: colorMapbBack[currRaw.code],
            fill: true, cubicInterpolationMode: 'monotone', tension: 0.4
        };
        return [...acc, curr]
    }, []);
    const dataDesc = { labels: labels, datasets: datasets };
    const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    const config = {
        type: 'line',
        data: dataDesc,
        options: {
            responsive: true,
            maintainAspectRatio: false,
            aspectRatio: 0.5,
            plugins: {
                title: {
                    display: true,
                    text: `${(new Date()).toLocaleDateString('en-EN', options)}`
                },
                font: {
                    family: "'Roboto', 'Helvetica', 'Arial', sans-serif"
                }
            },
            interaction: {
                intersect: false,
                mode: 'index'
            }, scales: {
                x: {
                    display: true,
                    title: { display: true }
                },
                y: {
                    display: true,
                    title: { display: true, text: 'PLN' },
                    min: 3.5,
                    max: 5
                }
            }
        },
    };
    const ctx = document.getElementById('charts');
    Chart.defaults.font = { ...Chart.defaults.font, family: "'Roboto', 'Helvetica', 'Arial', sans-serif" };
    const myChart = new Chart(ctx, config);
})();

// NBRB API for PLN, USD, EUR
(async function () {
    const currencies = [
        { id: 452, name: 'PLN', color: '#DC143C', bgColor: '#FF6B6B' },
        { id: 431, name: 'USD', color: '#6B8068', bgColor: '#B2B2B2' },
        { id: 451, name: 'EUR', color: '#003399', bgColor: '#737373' },
        
    ];
    
    // Fetch current rates for all currencies
    const currentRates = await Promise.all(
        currencies.map(curr => fetch(`https://api.nbrb.by/exrates/rates/${curr.id}`))
    );
    const currentData = await Promise.all(currentRates.map(res => res.json()));
    
    // Display current rates
    currentData.forEach((data, index) => {
        const container = document.querySelector(`#pln-current`);
        if (container && index === 0) {
            container.innerHTML = currencies.map((curr, i) => 
                `${curr.name}: ${(currentData[i].Cur_OfficialRate / currentData[i].Cur_Scale).toFixed(5)}`
            ).join(' | ');
        }
    });

    // Fetch historical data for chart
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - DATA_COUNT);
    
    const formatDate = (date) => {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    };

    const historicalResponses = await Promise.all(
        currencies.map(curr => 
            fetch(`https://api.nbrb.by/exrates/rates/dynamics/${curr.id}?startdate=${formatDate(startDate)}&enddate=${formatDate(endDate)}`)
        )
    );
    const historicalData = await Promise.all(historicalResponses.map(res => res.json()));

    const labels = historicalData[0].map(item => item.Date.split('T')[0]);
    
    const datasets = currencies.map((curr, index) => ({
        label: curr.name,
        data: historicalData[index].map(item => item.Cur_OfficialRate / currentData[index].Cur_Scale),
        borderColor: curr.color,
        backgroundColor: curr.bgColor,
        fill: true,
        cubicInterpolationMode: 'monotone',
        tension: 0.4
    }));

    const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    const config = {
        type: 'line',
        data: {
            labels: labels,
            datasets: datasets
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            aspectRatio: 0.5,
            plugins: {
                title: {
                    display: true,
                    text: `${(new Date()).toLocaleDateString('en-EN', options)}`
                },
                font: {
                    family: "'Roboto', 'Helvetica', 'Arial', sans-serif"
                }
            },
            interaction: {
                intersect: false,
                mode: 'index'
            },
            scales: {
                x: {
                    display: true,
                    title: { display: true }
                },
                y: {
                    display: true,
                    title: { display: true, text: 'BYN' }
                }
            }
        }
    };

    const ctx = document.getElementById('charts_nbrb');
    const nbrbChart = new Chart(ctx, config);
    
    // PLN to BYN converter
    const converterContainer = document.querySelector('#converter-pln-byn');
    if (converterContainer) {
        const plnRate = currentData[0].Cur_OfficialRate / currentData[0].Cur_Scale;
        
        converterContainer.innerHTML = `
            <div style="padding: 20px;">
                <h3>PLN ⇄ BYN Converter</h3>
                <div style="margin: 10px 0;">
                    <label for="pln-input" style="display: block; margin-bottom: 5px;">PLN:</label>
                    <input type="number" id="pln-input" value="100" style="padding: 8px; width: 200px; font-size: 16px;">
                </div>
                <div style="margin: 10px 0;">
                    <label for="byn-output" style="display: block; margin-bottom: 5px;">BYN:</label>
                    <input type="number" id="byn-output" style="padding: 8px; width: 200px; font-size: 16px;">
                </div>
                <div style="margin-top: 10px; color: #666;">
                    Rate: 1 PLN = ${plnRate.toFixed(5)} BYN
                </div>
            </div>
        `;
        
        const plnInput = document.getElementById('pln-input');
        const bynOutput = document.getElementById('byn-output');
        
        let isConverting = false;
        
        const convertPlnToByn = () => {
            if (isConverting) return;
            isConverting = true;
            const plnAmount = parseFloat(plnInput.value) || 0;
            const bynAmount = plnAmount * plnRate;
            bynOutput.value = bynAmount.toFixed(4);
            isConverting = false;
        };
        
        const convertBynToPln = () => {
            if (isConverting) return;
            isConverting = true;
            const bynAmount = parseFloat(bynOutput.value) || 0;
            const plnAmount = bynAmount / plnRate;
            plnInput.value = plnAmount.toFixed(4);
            isConverting = false;
        };
        
        plnInput.addEventListener('input', convertPlnToByn);
        bynOutput.addEventListener('input', convertBynToPln);
        convertPlnToByn(); // Initial conversion
    }
})()