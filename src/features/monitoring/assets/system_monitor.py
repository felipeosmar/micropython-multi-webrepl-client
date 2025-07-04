# System Monitor Script for MicroPython
# Collects system metrics and sends them via marked output

import gc
import machine
import time
import json

def get_system_metrics():
    """Collect system metrics"""
    try:
        metrics = {
            'memory': {
                'free': gc.mem_free(),
                'allocated': gc.mem_alloc()
            },
            'freq': machine.freq(),
            'timestamp': time.time()
        }
        
        # Try to get temperature if available
        try:
            if hasattr(machine, 'temperature'):
                metrics['temp'] = machine.temperature()
        except:
            pass
            
        return metrics
    except Exception as e:
        return {'error': str(e), 'timestamp': time.time()}

def send_metrics():
    """Send metrics with monitoring marker"""
    metrics = get_system_metrics()
    print(f"__MONITOR_DATA__{json.dumps(metrics)}")

# Execute monitoring
send_metrics()