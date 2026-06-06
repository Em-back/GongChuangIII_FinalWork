from fastapi import APIRouter
import psutil
import time

router = APIRouter()

boot_time = time.time()

last_net = psutil.net_io_counters()

last_time = time.time()

@router.get("/health")
def health():
    return {"status": "ok"}

@router.get("/stats")
def stats():

    global last_net
    global last_time

    now = time.time()

    net = psutil.net_io_counters()

    interval = now - last_time

    sent_speed = (
        net.bytes_sent
        - last_net.bytes_sent
    ) / interval / 1024

    recv_speed = (
        net.bytes_recv
        - last_net.bytes_recv
    ) / interval / 1024

    last_net = net
    last_time = now

    return {

        "cpu":
            psutil.cpu_percent(),

        "memory":
            psutil.virtual_memory().percent,

        "disk":
            psutil.disk_usage("/").percent,

        "cores":
            psutil.cpu_count(),

        "uptime":
            int(
                time.time()
                - boot_time
            ),

        "net_sent":
            round(sent_speed,2),

        "net_recv":
            round(recv_speed,2)
    }