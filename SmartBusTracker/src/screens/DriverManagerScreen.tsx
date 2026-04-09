import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    FlatList,
    Alert,
    Modal,
    TextInput,
    ActivityIndicator,
    SafeAreaView,
    KeyboardAvoidingView,
    Platform,
    ScrollView
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons, Feather } from '@expo/vector-icons';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../firebase/config';
import { Bus } from '../types';

// API Configuration - In a real app, this would be in a config file
const API_BASE_URL = 'http://localhost:8000/api/admin'; 

export default function DriverManagerScreen() {
    const navigation = useNavigation();
    const [drivers, setDrivers] = useState<any[]>([]);
    const [buses, setBuses] = useState<Bus[]>([]);
    const [loading, setLoading] = useState(true);
    const [modalVisible, setModalVisible] = useState(false);
    
    // New Driver Form State
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('password123'); // Default for ease
    const [selectedBusId, setSelectedBusId] = useState('');
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        setLoading(true);
        try {
            // 1. Fetch Drivers via Backend API
            const response = await fetch(`${API_BASE_URL}/drivers`);
            const driversData = await response.json();
            setDrivers(driversData);

            // 2. Fetch Buses via Firestore (for assignment)
            const busesSnap = await getDocs(collection(db, 'buses'));
            const busesList: Bus[] = [];
            busesSnap.forEach(doc => {
                busesList.push({ id: doc.id, ...doc.data() } as Bus);
            });
            setBuses(busesList);
        } catch (error) {
            console.error("Error fetching management data:", error);
            Alert.alert("Error", "Failed to connect to backend server.");
        } finally {
            setLoading(false);
        }
    };

    const handleAddDriver = async () => {
        if (!name || !email || !password) {
            Alert.alert("Error", "All fields are required");
            return;
        }

        setSubmitting(true);
        try {
            const response = await fetch(`${API_BASE_URL}/drivers`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    email,
                    password,
                    name,
                    assigned_bus_id: selectedBusId || null
                })
            });

            const result = await response.json();
            if (response.ok) {
                Alert.alert("Success", "Driver account created successfully!");
                setModalVisible(false);
                fetchData();
                // Reset form
                setName('');
                setEmail('');
                setSelectedBusId('');
            } else {
                Alert.alert("Error", result.detail || "Failed to create driver");
            }
        } catch (error) {
            Alert.alert("Error", "Could not connect to backend");
        } finally {
            setSubmitting(false);
        }
    };

    const handleDeleteDriver = (uid: string, driverName: string) => {
        Alert.alert(
            "Delete Driver",
            `Are you sure you want to remove ${driverName}? This will revoke their access completely.`,
            [
                { text: "Cancel", style: "cancel" },
                { 
                    text: "Delete", 
                    style: "destructive",
                    onPress: async () => {
                        try {
                            const response = await fetch(`${API_BASE_URL}/drivers/${uid}`, {
                                method: 'DELETE'
                            });
                            if (response.ok) {
                                fetchData();
                            } else {
                                Alert.alert("Error", "Failed to delete driver");
                            }
                        } catch (error) {
                            Alert.alert("Error", "Backend connection failed");
                        }
                    }
                }
            ]
        );
    };

    const renderDriverItem = ({ item }: { item: any }) => (
        <View style={styles.driverCard}>
            <View style={styles.driverInfo}>
                <View style={styles.avatar}>
                    <Text style={styles.avatarText}>{item.name?.[0].toUpperCase()}</Text>
                </View>
                <View style={styles.details}>
                    <Text style={styles.driverName}>{item.name}</Text>
                    <Text style={styles.driverEmail}>{item.email}</Text>
                    <View style={styles.busBadge}>
                        <Ionicons name="bus-outline" size={12} color="#007AFF" />
                        <Text style={styles.busBadgeText}>
                            {item.assignedBusId ? `Assigned to ${item.assignedBusId}` : 'No Bus Assigned'}
                        </Text>
                    </View>
                </View>
            </View>
            <TouchableOpacity 
                onPress={() => handleDeleteDriver(item.uid, item.name)}
                style={styles.deleteBtn}
            >
                <Feather name="trash-2" size={20} color="#FF3B30" />
            </TouchableOpacity>
        </View>
    );

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
                    <Ionicons name="chevron-back" size={24} color="#007AFF" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Drivers</Text>
                <TouchableOpacity onPress={() => setModalVisible(true)} style={styles.addBtn}>
                    <Ionicons name="add" size={28} color="#fff" />
                </TouchableOpacity>
            </View>

            {loading ? (
                <View style={styles.centered}>
                    <ActivityIndicator size="large" color="#007AFF" />
                </View>
            ) : (
                <FlatList
                    data={drivers}
                    keyExtractor={(item) => item.uid}
                    renderItem={renderDriverItem}
                    contentContainerStyle={styles.listContent}
                    ListEmptyComponent={
                        <View style={styles.emptyContainer}>
                            <Feather name="users" size={48} color="#C7C7CC" />
                            <Text style={styles.emptyText}>No drivers found.</Text>
                        </View>
                    }
                />
            )}

            <Modal
                animationType="slide"
                transparent={true}
                visible={modalVisible}
                onRequestClose={() => setModalVisible(false)}
            >
                <KeyboardAvoidingView 
                    behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                    style={styles.modalOverlay}
                >
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Add New Driver</Text>
                            <TouchableOpacity onPress={() => setModalVisible(false)}>
                                <Ionicons name="close" size={24} color="#8E8E93" />
                            </TouchableOpacity>
                        </View>

                        <ScrollView showsVerticalScrollIndicator={false}>
                            <Text style={styles.inputLabel}>Full Name</Text>
                            <TextInput
                                style={styles.input}
                                value={name}
                                onChangeText={setName}
                                placeholder="Enter driver's name"
                            />

                            <Text style={styles.inputLabel}>Email Address (Login ID)</Text>
                            <TextInput
                                style={styles.input}
                                value={email}
                                onChangeText={setEmail}
                                placeholder="driver@smartbus.com"
                                autoCapitalize="none"
                                keyboardType="email-address"
                            />

                            <Text style={styles.inputLabel}>Assigned Bus ID (Optional)</Text>
                            <View style={styles.busSelector}>
                                {buses.map(bus => (
                                    <TouchableOpacity 
                                        key={bus.id}
                                        style={[
                                            styles.busChip, 
                                            selectedBusId === bus.id && styles.selectedBusChip
                                        ]}
                                        onPress={() => setSelectedBusId(bus.id === selectedBusId ? '' : bus.id)}
                                    >
                                        <Text style={[
                                            styles.busChipText,
                                            selectedBusId === bus.id && styles.selectedBusChipText
                                        ]}>{bus.id}</Text>
                                    </TouchableOpacity>
                                ))}
                            </View>

                            <TouchableOpacity 
                                style={[styles.submitBtn, submitting && styles.disabledBtn]}
                                onPress={handleAddDriver}
                                disabled={submitting}
                            >
                                {submitting ? (
                                    <ActivityIndicator color="#fff" />
                                ) : (
                                    <Text style={styles.submitBtnText}>Create Driver Account</Text>
                                )}
                            </TouchableOpacity>
                        </ScrollView>
                    </View>
                </KeyboardAvoidingView>
            </Modal>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F8F9FA',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 12,
        backgroundColor: '#fff',
        borderBottomWidth: 1,
        borderBottomColor: '#E9ECEF',
    },
    backBtn: {
        padding: 4,
    },
    headerTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#1a1a1a',
    },
    addBtn: {
        backgroundColor: '#007AFF',
        borderRadius: 8,
        padding: 4,
    },
    listContent: {
        padding: 16,
    },
    driverCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#fff',
        padding: 16,
        borderRadius: 16,
        marginBottom: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 10,
        elevation: 2,
    },
    driverInfo: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
    },
    avatar: {
        width: 50,
        height: 50,
        borderRadius: 25,
        backgroundColor: '#F0F7FF',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 15,
    },
    avatarText: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#007AFF',
    },
    details: {
        flex: 1,
    },
    driverName: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#1a1a1a',
    },
    driverEmail: {
        fontSize: 13,
        color: '#8E8E93',
        marginTop: 2,
    },
    busBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#F0F7FF',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 6,
        marginTop: 6,
        alignSelf: 'flex-start',
    },
    busBadgeText: {
        fontSize: 11,
        fontWeight: '600',
        color: '#007AFF',
        marginLeft: 4,
    },
    deleteBtn: {
        padding: 10,
    },
    centered: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    emptyContainer: {
        alignItems: 'center',
        marginTop: 100,
    },
    emptyText: {
        marginTop: 16,
        fontSize: 16,
        color: '#8E8E93',
    },
    modalOverlay: {
        flex: 1,
        justifyContent: 'flex-end',
        backgroundColor: 'rgba(0,0,0,0.5)',
    },
    modalContent: {
        backgroundColor: '#fff',
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        padding: 24,
        maxHeight: '80%',
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 24,
    },
    modalTitle: {
        fontSize: 22,
        fontWeight: 'bold',
        color: '#1a1a1a',
    },
    inputLabel: {
        fontSize: 14,
        fontWeight: '600',
        color: '#495057',
        marginBottom: 8,
    },
    input: {
        backgroundColor: '#F8F9FA',
        borderRadius: 12,
        padding: 14,
        fontSize: 16,
        marginBottom: 20,
        borderWidth: 1,
        borderColor: '#E9ECEF',
    },
    busSelector: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        marginBottom: 24,
    },
    busChip: {
        backgroundColor: '#F8F9FA',
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 8,
        marginRight: 8,
        marginBottom: 8,
        borderWidth: 1,
        borderColor: '#E9ECEF',
    },
    selectedBusChip: {
        backgroundColor: '#007AFF',
        borderColor: '#007AFF',
    },
    busChipText: {
        fontSize: 13,
        color: '#495057',
    },
    selectedBusChipText: {
        color: '#fff',
        fontWeight: 'bold',
    },
    submitBtn: {
        backgroundColor: '#007AFF',
        borderRadius: 12,
        padding: 16,
        alignItems: 'center',
        marginTop: 10,
    },
    disabledBtn: {
        backgroundColor: '#B4D7FF',
    },
    submitBtnText: {
        color: '#fff',
        fontSize: 17,
        fontWeight: 'bold',
    },
});
