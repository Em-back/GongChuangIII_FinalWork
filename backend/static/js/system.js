let cpuChart;
let memChart;

document.addEventListener(
    "DOMContentLoaded",
    () => {

        initCharts();

        startDashboard();
    }
);

function initCharts(){

    cpuChart = new Chart(
        document.getElementById(
            "cpuChart"
        ),
        {
            type:"line",
            data:{
                labels:[],
                datasets:[
                    {
                        label:"CPU %",
                        data:[]
                    }
                ]
            },
            options:{
                animation:false,
                responsive:true
            }
        }
    );

    memChart = new Chart(
        document.getElementById(
            "memChart"
        ),
        {
            type:"line",
            data:{
                labels:[],
                datasets:[
                    {
                        label:"Memory %",
                        data:[]
                    }
                ]
            },
            options:{
                animation:false,
                responsive:true
            }
        }
    );
}

function formatUptime(sec){

    const d =
        Math.floor(sec/86400);

    const h =
        Math.floor(
            (sec%86400)/3600
        );

    const m =
        Math.floor(
            (sec%3600)/60
        );

    return `${d}天${h}小时${m}分钟`;
}

async function updateDashboard(){

    try{

        const res =
            await fetch(
                "/api/system/stats"
            );

        const data =
            await res.json();

        document
        .getElementById(
            "diskValue"
        )
        .innerText =
            data.disk;

        document
        .getElementById(
            "netSent"
        )
        .innerText =
            data.net_sent;

        document
        .getElementById(
            "netRecv"
        )
        .innerText =
            data.net_recv;

        document
        .getElementById(
            "cpuCores"
        )
        .innerText =
            data.cores;

        document
        .getElementById(
            "uptimeValue"
        )
        .innerText =
            formatUptime(
                data.uptime
            );

        updateCharts(data);

    }catch(err){

        console.error(err);

    }
}

function updateCharts(data){

    const label =
        new Date()
        .toLocaleTimeString();

    cpuChart.data.labels.push(label);

    cpuChart.data.datasets[0]
    .data.push(data.cpu);

    memChart.data.labels.push(label);

    memChart.data.datasets[0]
    .data.push(data.memory);

    if(cpuChart.data.labels.length > 20){

        cpuChart.data.labels.shift();

        cpuChart.data.datasets[0]
        .data.shift();

        memChart.data.labels.shift();

        memChart.data.datasets[0]
        .data.shift();
    }

    cpuChart.update();

    memChart.update();
}

async function startDashboard(){

    while(true){

        await updateDashboard();

        await new Promise(
            r => setTimeout(r,1000)
        );

    }
}