import { loadContacts, saveContacts } from '@/lib/contactsStorage';
import { Check, CreditCard as Edit3, Mail, Phone, Plus, Trash2, UserPlus, Users, X } from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
import {
    Alert,
    Modal,
    SafeAreaView,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';

interface Contact {
  id: string;
  name: string;
  phone: string;
  email?: string;
  relationship: string;
  isPrimary: boolean;
}

export default function ContactsScreen() {
  const [contacts, setContacts] = useState<Contact[]>([
    {
      id: '1',
      name: 'Ashish Negi',
      phone: '+919315379835',
      email: '05ashish04@gamil.com',
      relationship: 'Friend',
      isPrimary: true,
    },
    {
      id: '2',
      name: 'Praxy M',
      phone: '+919419057693',
      email: 'prtyxh@gmail.com',
      relationship: 'Friend',
      isPrimary: false,
    },
  ]);

  const [isAddModalVisible, setIsAddModalVisible] = useState(false);
  const [editingContact, setEditingContact] = useState<Contact | null>(null);
  const [newContact, setNewContact] = useState({
    name: '',
    phone: '',
    email: '',
    relationship: '',
  });
  const [isAdding, setIsAdding] = useState(false);

  const generateId = () => `${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;

  const handleAddContact = () => {
    if (isAdding) return;
    if (!newContact.name || !newContact.phone) {
      Alert.alert('Error', 'Name and phone number are required');
      return;
    }

    setIsAdding(true);

    const contact: Contact = {
      id: generateId(),
      name: newContact.name,
      phone: newContact.phone,
      email: newContact.email,
      relationship: newContact.relationship || 'Other',
      isPrimary: contacts.length === 0,
    };

    const updated = [...contacts, contact];
    setContacts(updated);
    saveContacts(updated);
    setNewContact({ name: '', phone: '', email: '', relationship: '' });
    setIsAddModalVisible(false);
    setIsAdding(false);
  };

  const handleDeleteContact = (id: string) => {
    Alert.alert(
      'Delete Contact',
      'Are you sure you want to remove this emergency contact?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            const updated = contacts.filter(c => c.id !== id);
            setContacts(updated);
            saveContacts(updated);
          },
        },
      ]
    );
  };

  const handleSetPrimary = (id: string) => {
    const updated = contacts.map(contact => ({
      ...contact,
      isPrimary: contact.id === id,
    }));
    setContacts(updated);
    saveContacts(updated);
  };

  useEffect(() => {
    loadContacts().then((loaded) => {
      if (Array.isArray(loaded) && loaded.length > 0) {
        setContacts(loaded as Contact[]);
      }
    });
  }, []);

  const ContactModal = () => (
    <Modal
      visible={isAddModalVisible}
      animationType="slide"
      presentationStyle="fullScreen"
    >
      <SafeAreaView style={styles.modalContainer}>
        <View style={styles.modalHeader}>
          <TouchableOpacity onPress={() => setIsAddModalVisible(false)}>
            <X size={24} color="#6B7280" />
          </TouchableOpacity>
          <Text style={styles.modalTitle}>Add Emergency Contact</Text>
          <TouchableOpacity onPress={handleAddContact} disabled={isAdding || !newContact.name || !newContact.phone}>
            <Check size={24} color="#059669" />
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.modalContent} keyboardShouldPersistTaps="handled">
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Name *</Text>
            <TextInput
              style={styles.textInput}
              value={newContact.name}
              onChangeText={(text) => setNewContact({ ...newContact, name: text })}
              placeholder="Enter contact name"
              placeholderTextColor="#9CA3AF"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Phone Number *</Text>
            <TextInput
              style={styles.textInput}
              value={newContact.phone}
              onChangeText={(text) => setNewContact({ ...newContact, phone: text })}
              placeholder="+1 (555) 123-4567"
              placeholderTextColor="#9CA3AF"
              keyboardType="phone-pad"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Email</Text>
            <TextInput
              style={styles.textInput}
              value={newContact.email}
              onChangeText={(text) => setNewContact({ ...newContact, email: text })}
              placeholder="contact@example.com"
              placeholderTextColor="#9CA3AF"
              keyboardType="email-address"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Relationship</Text>
            <TextInput
              style={styles.textInput}
              value={newContact.relationship}
              onChangeText={(text) => setNewContact({ ...newContact, relationship: text })}
              placeholder="Family, Friend, Colleague, etc."
              placeholderTextColor="#9CA3AF"
            />
          </View>
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Emergency Contacts</Text>
          <Text style={styles.headerSubtitle}>
            People who will be notified during emergencies
          </Text>
        </View>

        {/* Add Contact Button */}
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => !isAddModalVisible && setIsAddModalVisible(true)}
          disabled={isAddModalVisible}
        >
          <Plus size={20} color="#FFFFFF" />
          <Text style={styles.addButtonText}>Add Emergency Contact</Text>
        </TouchableOpacity>

        {/* Contacts List */}
        {contacts.length === 0 ? (
          <View style={styles.emptyState}>
            <UserPlus size={48} color="#9CA3AF" />
            <Text style={styles.emptyTitle}>No Emergency Contacts</Text>
            <Text style={styles.emptySubtitle}>
              Add contacts who should be notified in case of an emergency
            </Text>
          </View>
        ) : (
          <View style={styles.contactsList}>
            {contacts.map((contact) => (
              <View key={contact.id} style={styles.contactCard}>
                {contact.isPrimary && (
                  <View style={styles.primaryBadge}>
                    <Text style={styles.primaryBadgeText}>Primary</Text>
                  </View>
                )}
                
                <View style={styles.contactInfo}>
                  <Text style={styles.contactName}>{contact.name}</Text>
                  <Text style={styles.contactRelationship}>{contact.relationship}</Text>
                  
                  <View style={styles.contactDetails}>
                    <View style={styles.contactDetail}>
                      <Phone size={16} color="#6B7280" />
                      <Text style={styles.contactDetailText}>{contact.phone}</Text>
                    </View>
                    {contact.email && (
                      <View style={styles.contactDetail}>
                        <Mail size={16} color="#6B7280" />
                        <Text style={styles.contactDetailText}>{contact.email}</Text>
                      </View>
                    )}
                  </View>
                </View>

                <View style={styles.contactActions}>
                  {!contact.isPrimary && (
                    <TouchableOpacity
                      style={styles.actionButton}
                      onPress={() => handleSetPrimary(contact.id)}
                    >
                      <Text style={styles.primaryButtonText}>Set Primary</Text>
                    </TouchableOpacity>
                  )}
                  
                  <View style={styles.iconActions}>
                    <TouchableOpacity
                      style={styles.iconButton}
                      onPress={() => setEditingContact(contact)}
                    >
                      <Edit3 size={18} color="#6B7280" />
                    </TouchableOpacity>
                    
                    <TouchableOpacity
                      style={styles.iconButton}
                      onPress={() => handleDeleteContact(contact.id)}
                    >
                      <Trash2 size={18} color="#DC2626" />
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            ))}
          </View>
        )}

        {/* Information Card */}
        <View style={styles.infoCard}>
          <Users size={20} color="#3B82F6" />
          <View style={styles.infoContent}>
            <Text style={styles.infoTitle}>How Emergency Contacts Work</Text>
            <Text style={styles.infoText}>
              When you activate Emergency SOS, these contacts will receive:
              {'\n'}• Your exact location with map link
              {'\n'}• Emergency alert notification
              {'\n'}• Live location tracking updates
              {'\n'}• Option to call emergency services
            </Text>
          </View>
        </View>
      </ScrollView>

      <ContactModal />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  scrollView: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 24,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 16,
    color: '#6B7280',
  },
  addButton: {
    backgroundColor: '#059669',
    marginHorizontal: 24,
    marginBottom: 24,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    shadowColor: '#059669',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  addButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  emptyState: {
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 60,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#111827',
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 24,
  },
  contactsList: {
    paddingHorizontal: 24,
    marginBottom: 24,
  },
  contactCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  primaryBadge: {
    backgroundColor: '#059669',
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    marginBottom: 12,
  },
  primaryBadgeText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  contactInfo: {
    marginBottom: 16,
  },
  contactName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  contactRelationship: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 12,
  },
  contactDetails: {
    gap: 8,
  },
  contactDetail: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  contactDetailText: {
    fontSize: 14,
    color: '#374151',
    marginLeft: 8,
  },
  contactActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  actionButton: {
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  primaryButtonText: {
    color: '#3B82F6',
    fontSize: 14,
    fontWeight: '600',
  },
  iconActions: {
    flexDirection: 'row',
    gap: 12,
  },
  iconButton: {
    padding: 8,
  },
  infoCard: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 24,
    marginBottom: 32,
    padding: 20,
    borderRadius: 16,
    flexDirection: 'row',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  infoContent: {
    flex: 1,
    marginLeft: 16,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 8,
  },
  infoText: {
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 20,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
  },
  modalContent: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 24,
  },
  inputGroup: {
    marginBottom: 24,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 8,
  },
  textInput: {
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: '#111827',
  },
});