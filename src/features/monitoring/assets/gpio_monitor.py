# GPIO Monitor Script for MicroPython
# Monitors GPIO pin states and sends them via marked output

import json
from machine import Pin

def get_gpio_states():
    """Get states of common GPIO pins"""
    try:
        # Common GPIO pins for ESP32 (adjust for your board)
        pin_numbers = [2, 4, 5, 16, 17, 18, 19, 21, 22, 23, 25, 26, 27, 32, 33]
        
        states = {}
        for pin_num in pin_numbers:
            try:
                pin = Pin(pin_num, Pin.IN)
                states[f'pin_{pin_num}'] = pin.value()
            except:
                # Skip pins that can't be read
                pass
                
        return states
    except Exception as e:
        return {'error': str(e)}

def send_gpio_states():
    """Send GPIO states with monitoring marker"""
    states = get_gpio_states()
    print(f"__GPIO_STATE__{json.dumps(states)}")

# Execute GPIO monitoring
send_gpio_states()