# This file is executed on every boot (including wake-boot from deepsleep)
import esp, machine, network, webrepl
esp.osdebug(None)

wlan = network.WLAN()
wlan.active(True)
if not wlan.isconnected():
    print('connecting to network...')
    wlan.connect('FIESC_IOT', 'urb@1983')
    while not wlan.isconnected():
        machine.idle()
print('network config:', wlan.ipconfig('addr4'))

# A string de bytes recebida do microcontrolador
mac_bytes = wlan.config('mac')

# Converte cada byte para uma string hexadecimal de 2 dígitos
# e junta tudo com ":" no meio
mac_address = ':'.join([f'{byte:02X}' for byte in mac_bytes])

print(f"A string de bytes é: {mac_bytes}")
print(f"O endereço MAC decodificado é: {mac_address}")
webrepl.start()