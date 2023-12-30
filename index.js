import './normalize.css';
import './index.css';
(
    async function () {
        const container = document.querySelector('#eur-current');
        const response = await fetch('http://api.nbp.pl/api/exchangerates/rates/A/EUR?format=json');
        const data = await response.json();
        if (container) {
            container.innerHTML = `${data.code.toUpperCase()}: ${data.rates[0].mid}`;
        }
    }
)();
(
    async function () {
        const container = document.querySelector('#usd-current');
        const response = await fetch('http://api.nbp.pl/api/exchangerates/rates/A/USD?format=json');
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
        fetch(`http://api.nbp.pl/api/exchangerates/rates/A/USD//last/${DATA_COUNT}?format=json`),
        fetch(`http://api.nbp.pl/api/exchangerates/rates/A/EUR//last/${DATA_COUNT}?format=json`)
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
                    suggestedMin: 3,
                    suggestedMax: 6
                }
            }
        },
    };
    const ctx = document.getElementById('charts');
    Chart.defaults.font = { ...Chart.defaults.font, family: "'Roboto', 'Helvetica', 'Arial', sans-serif" };
    const myChart = new Chart(ctx, config);
})() 