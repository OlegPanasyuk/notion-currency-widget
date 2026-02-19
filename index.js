const createDirectionMarkup = (direction) => {
    if (direction > 0) {
        return '<span style="color: #0B8F3C; font-weight: 700;">&uarr;</span>';
    }
    if (direction < 0) {
        return '<span style="color: #CC2B2B; font-weight: 700;">&darr;</span>';
    }
    return '<span>-</span>';
};

const setFallbackRateValue = async (container, code, previousResponse) => {
    if (previousResponse && previousResponse.ok) {
        const previousData = await previousResponse.json();
        const previousRate = previousData?.rates?.[0]?.mid;
        if (typeof previousRate === 'number') {
            container.textContent = `${code}: ${previousRate.toFixed(4)} -`;
            return;
        }
    }

    container.textContent = `${code}: -`;
};

const formatDate = (date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

const extractDate = (dateValue) => {
    if (typeof dateValue !== 'string') {
        return '';
    }

    return dateValue.split('T')[0];
};

const renderNbpCurrentRate = async (code, selector) => {
    const container = document.querySelector(selector);
    if (!container) {
        return;
    }

    try {
        const [todayResponse, previousResponse] = await Promise.all([
            fetch(`https://api.nbp.pl/api/exchangerates/rates/A/${code}/today?format=json`),
            fetch(`https://api.nbp.pl/api/exchangerates/rates/A/${code}/last/2?format=json`)
        ]);

        if (!todayResponse.ok) {
            await setFallbackRateValue(container, code, previousResponse);
            return;
        }

        const todayData = await todayResponse.json();
        const currentRate = todayData?.rates?.[0]?.mid;
        const currentDate = todayData?.rates?.[0]?.effectiveDate;

        if (typeof currentRate !== 'number') {
            await setFallbackRateValue(container, code, previousResponse);
            return;
        }

        let direction = 0;
        if (previousResponse.ok) {
            const previousData = await previousResponse.json();
            const previousRate = previousData?.rates?.find((rate) => rate.effectiveDate !== currentDate)?.mid;
            if (typeof previousRate === 'number') {
                direction = currentRate - previousRate;
            }
        }

        container.innerHTML = `${code}: ${currentRate.toFixed(4)} ${createDirectionMarkup(direction)}`;
    } catch (error) {
        await setFallbackRateValue(container, code, null);
    }
};

renderNbpCurrentRate('EUR', '#eur-current');
renderNbpCurrentRate('USD', '#usd-current');

const DATA_COUNT = 93;
const colorMapBorders = { EUR: '#003399', USD: '#6B8068' };
const colorMapbBack = { EUR: '#737373', USD: '#B2B2B2' };
const getLabels = (data) => { return data.rates.map(rate => rate.effectiveDate); };
const setupCollapseResize = (detailsId, chart) => {
    const details = document.getElementById(detailsId);
    if (!details || !chart) {
        return;
    }

    details.addEventListener('toggle', () => {
        if (details.open) {
            requestAnimationFrame(() => chart.resize());
        }
    });
};

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
        return [...acc, curr];
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
        }
    };
    const ctx = document.getElementById('charts');
    Chart.defaults.font = { ...Chart.defaults.font, family: "'Roboto', 'Helvetica', 'Arial', sans-serif" };
    const myChart = new Chart(ctx, config);
    setupCollapseResize('nbp-charts-collapse', myChart);
})();

// NBRB API for PLN, USD, EUR
(async function () {
    const currencies = [
        { id: 452, name: 'PLN', color: '#DC143C', bgColor: '#FF6B6B' },
        { id: 431, name: 'USD', color: '#6B8068', bgColor: '#B2B2B2' },
        { id: 451, name: 'EUR', color: '#003399', bgColor: '#737373' }
    ];

    // Fetch current rates for all currencies
    const currentRates = await Promise.all(
        currencies.map(curr => fetch(`https://api.nbrb.by/exrates/rates/${curr.id}`))
    );
    const currentData = await Promise.all(currentRates.map(res => res.json()));

    // Compare with previous available date and show direction for today's data
    const today = formatDate(new Date());
    const directionStartDate = new Date();
    directionStartDate.setDate(directionStartDate.getDate() - 7);
    const directionResponses = await Promise.all(
        currencies.map((curr) =>
            fetch(`https://api.nbrb.by/exrates/rates/dynamics/${curr.id}?startdate=${formatDate(directionStartDate)}&enddate=${today}`)
        )
    );
    const directionData = await Promise.all(directionResponses.map(res => res.json()));

    const directionByCurrency = directionData.map((series) => {
        if (!Array.isArray(series) || series.length === 0) {
            return null;
        }

        const todayIndex = series.findIndex((item) => extractDate(item.Date) === today);
        if (todayIndex === -1) {
            return null;
        }

        const todayRate = series[todayIndex]?.Cur_OfficialRate;
        if (typeof todayRate !== 'number') {
            return null;
        }

        for (let i = todayIndex - 1; i >= 0; i -= 1) {
            const previousRate = series[i]?.Cur_OfficialRate;
            if (typeof previousRate === 'number') {
                return todayRate - previousRate;
            }
        }

        return 0;
    });

    const plnCurrentContainer = document.querySelector('#pln-current');
    if (plnCurrentContainer) {
        plnCurrentContainer.innerHTML = currencies.map((curr, i) => {
            const item = currentData[i];
            const isTodayData = extractDate(item?.Date) === today;
            if (!isTodayData) {
                return `${curr.name}: -`;
            }

            const rateValue = item.Cur_OfficialRate / item.Cur_Scale;
            const direction = directionByCurrency[i];
            return `${curr.name}: ${rateValue.toFixed(5)} ${createDirectionMarkup(direction ?? 0)}`;
        }).join(' | ');
    }

    // Fetch historical data for chart
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - DATA_COUNT);

    const historicalResponses = await Promise.all(
        currencies.map(curr =>
            fetch(`https://api.nbrb.by/exrates/rates/dynamics/${curr.id}?startdate=${formatDate(startDate)}&enddate=${formatDate(endDate)}`)
        )
    );
    const historicalData = await Promise.all(historicalResponses.map(res => res.json()));

    const labels = historicalData[0].map(item => extractDate(item.Date));

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
    setupCollapseResize('nbrb-charts-collapse', nbrbChart);
    
    // PLN to BYN converter
    const converterContainer = document.querySelector('#converter-pln-byn');
    if (converterContainer) {
        const plnRate = currentData[0].Cur_OfficialRate / currentData[0].Cur_Scale;

        converterContainer.innerHTML = `
            <div style="padding: 20px;">
                <h3>PLN <-> BYN Converter</h3>
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
})();
