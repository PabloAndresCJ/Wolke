import React, { useState, useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { StyleSheet, Text, View, Button, FlatList, PermissionsAndroid, Platform, Modal, TouchableOpacity } from 'react-native';
import { BleManager } from 'react-native-ble-plx';
import * as Device from 'expo-device'; // Importar biblioteca para información del dispositivo

const App = () => {
  const [accessPermission, setAccessPermission] = useState(false);
  const [devices, setDevices] = useState([]);
  const [isScanning, setIsScanning] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [modalMessage, setModalMessage] = useState('');
  const [currentSubscription, setCurrentSubscription] = useState(null); // Para gestionar la suscripción activa
  const manager = new BleManager();

  // Solicitar permisos al iniciar la aplicación
  useEffect(() => {
    const requestPermissions = async () => {
      try {
        if (Platform.OS === 'android') {
          const osVersion = Number(Device.osVersion);

          if (osVersion >= 12) {
            const result = await PermissionsAndroid.requestMultiple([
              PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
              PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
              PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
            ]);
            handlePermissionsResult(result);
          } else if (osVersion >= 10) {
            const result = await PermissionsAndroid.request(
              PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION
            );
            handlePermissionsResult({ [PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION]: result });
          } else {
            const result = await PermissionsAndroid.request(
              PermissionsAndroid.PERMISSIONS.ACCESS_COARSE_LOCATION
            );
            handlePermissionsResult({ [PermissionsAndroid.PERMISSIONS.ACCESS_COARSE_LOCATION]: result });
          }
        } else {
          // iOS no requiere permisos explícitos para BLE
          setAccessPermission(true);
        }
      } catch (error) {
        console.error('Error al solicitar permisos:', error);
        alert('No se pudieron solicitar permisos para Bluetooth.');
      }
    };

    const handlePermissionsResult = (result) => {
      const allGranted = Object.values(result).every(status => status === PermissionsAndroid.RESULTS.GRANTED);
      setAccessPermission(allGranted);

      if (!allGranted) {
        alert('Se requieren permisos para acceder al Bluetooth.');
      }
    };

    requestPermissions();
  }, []);

  // Escaneo de dispositivos BLE
  const startScan = () => {
    if (!accessPermission) {
      alert('No tienes permisos para escanear dispositivos.');
      return;
    }

    console.log('Iniciando escaneo de dispositivos BLE...');
    setDevices([]);
    setIsScanning(true);

    manager.startDeviceScan(
      null, // Opcional: agregar UUIDs de servicios específicos si es necesario
      null,
      (error, device) => {
        if (error) {
          console.error('Error al escanear:', error.message);
          setIsScanning(false);
          return;
        }

        console.log('Dispositivo encontrado:', device.name || 'Sin nombre', device.id);

        if (device && device.name) {
          setDevices((prevDevices) => {
            const deviceExists = prevDevices.some((d) => d.id === device.id);
            if (!deviceExists) return [...prevDevices, { id: device.id, name: device.name }];
            return prevDevices;
          });
        }
      }
    );

    setTimeout(() => {
      manager.stopDeviceScan();
      console.log('Escaneo detenido.');
      setIsScanning(false);
      if (devices.length === 0) {
        alert('No se encontraron dispositivos')
      }
    }, 10000);
  };

  // Escuchar al dispositivo y monitorear características
  const startListening = (deviceId) => {
    setModalMessage(`Escuchando datos del dispositivo: ${deviceId}`);
    setModalVisible(true);
  
    manager.startDeviceScan(null, null, (error, device) => {
      if (error) {
        console.error('Error al escanear:', error.message);
        setModalMessage('Error al escuchar el dispositivo.');
        setModalVisible(false);
        return;
      }
  
      if (device.id === deviceId) {
        console.log('Datos del dispositivo:', device.manufacturerData, device.serviceData, device.name);
        setModalMessage(`Datos recibidos:
                        Nombre: ${device.name}
                        MAC: ${device.id}
                        Manufacturer: ${device.manufacturerData}
                        Service: ${device.serviceData}`);
      }
    });
  };
  
  const stopListening = () => {
    manager.stopDeviceScan();
    setModalMessage('Monitoreo detenido.');
    setModalVisible(false);
  };
  

  // Renderizar la lista de dispositivos encontrados
  const renderDeviceItem = ({ item }) => (
    <View style={styles.deviceItem}>
      <Text>{item.name}</Text>

      <TouchableOpacity
      style={styles.button}
      onPress={() => startListening(item.id)}>
        <Text style={styles.texto}>Escuchar</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Wolke BLE Monitor</Text>
      <TouchableOpacity
        style={styles.button}
        onPress={startScan}
        disabled={isScanning}>

          <Text style={styles.buttonText}>
            {isScanning ? 'Escaneando...' : 'Escanear Dispositivos'}
          </Text>
      </TouchableOpacity>
      <FlatList 
        style={styles.texto}
        data={devices}
        renderItem={renderDeviceItem}
        keyExtractor={(device) => device.id}
        
      />
      <Modal
        visible={modalVisible}
        transparent
        animationType="slide"
      >
        <View style={styles.modalView}>
          <Text>{modalMessage}</Text>
          <TouchableOpacity style={styles.cancelButton} onPress={stopListening}>
            <Text style={styles.buttonText}>Detener</Text>
          </TouchableOpacity>
        </View>
      </Modal>
      <StatusBar style="auto" />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 20,
    flex: 1,
    justifyContent: 'center',
    backgroundColor: '#1E1E1E', // Fondo más oscuro
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    color: '#FFFFFF',
    marginBottom: 20,
  },
  deviceItem: {
    padding: 15,
    backgroundColor: '#333333',
    marginBottom: 10,
    borderRadius: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  deviceText: {
    color: '#FFFFFF',
    fontSize: 16,
  },
  modalView: {
    marginTop: '50%',
    marginHorizontal: 20,
    padding: 20,
    backgroundColor: '#2C2C2C',
    borderRadius: 10,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  modalText: {
    color: '#FFFFFF',
    fontSize: 16,
    marginBottom: 20,
    textAlign: 'center',
  },
  button: {
    backgroundColor: '#6200EE',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
    alignItems: 'center',
    marginVertical: 5,
  },
  cancelButton: {
    backgroundColor: '#B00020',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
    alignItems: 'center',
    marginVertical: 5,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  texto: {
    textAlign: 'center',
    color: '#FFFFFF',
  },
});


export default App;
