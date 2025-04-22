import React, { useState } from 'react';
import { StyleSheet, View, TouchableOpacity, Text, Dimensions, Modal, Platform, Alert } from 'react-native';
import { useRouter } from 'expo-router';

export default function PdfViewer({ pdfPath, pdfTitle }) {
  const router = useRouter();
  const [totalPages, setTotalPages] = useState(10); // Mock value
  const [currentPage, setCurrentPage] = useState(1);
  const [menuVisible, setMenuVisible] = useState(false);
  
  const toggleMenu = () => setMenuVisible(!menuVisible);
  
  const nextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage(currentPage + 1);
    }
  };
  
  const prevPage = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1);
    }
  };
  
  const bookmarkPage = async () => {
    const message = `Đã đánh dấu trang ${currentPage}`;
    Alert.alert('Thông báo', message);
    toggleMenu();
  };
  
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.backButton}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.title} numberOfLines={1}>{pdfTitle || 'PDF Viewer'}</Text>
        <TouchableOpacity onPress={toggleMenu}>
          <Text style={styles.menuButton}>⋮</Text>
        </TouchableOpacity>
      </View>
      
      <View style={styles.pdfPlaceholder}>
        <Text style={styles.placeholderText}>PDF Viewer</Text>
        <Text style={styles.placeholderSubtext}>This is a placeholder for the PDF viewer</Text>
        <Text style={styles.placeholderSubtext}>PDF path: {pdfPath || 'Not provided'}</Text>
      </View>
      
      <View style={styles.footer}>
        <TouchableOpacity onPress={prevPage} disabled={currentPage === 1}>
          <Text style={[styles.navButton, currentPage === 1 && styles.disabledButton]}>Previous</Text>
        </TouchableOpacity>
        <Text>{currentPage} / {totalPages}</Text>
        <TouchableOpacity onPress={nextPage} disabled={currentPage === totalPages}>
          <Text style={[styles.navButton, currentPage === totalPages && styles.disabledButton]}>Next</Text>
        </TouchableOpacity>
      </View>
      
      <Modal
        transparent={true}
        visible={menuVisible}
        onRequestClose={toggleMenu}
      >
        <TouchableOpacity 
          style={styles.modalOverlay} 
          activeOpacity={1} 
          onPress={toggleMenu}
        >
          <View style={styles.menuContainer}>
            <TouchableOpacity style={styles.menuItem} onPress={bookmarkPage}>
              <Text style={styles.menuText}>Đánh dấu trang</Text>
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.menuItem} onPress={toggleMenu}>
              <Text style={styles.menuText}>Lưu vào thư viện</Text>
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.menuItem} onPress={toggleMenu}>
              <Text style={styles.menuText}>Chia sẻ</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  title: {
    flex: 1,
    fontSize: 18,
    fontWeight: 'bold',
    marginHorizontal: 16,
  },
  backButton: {
    fontSize: 16,
    color: '#0066cc',
  },
  menuButton: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  pdfPlaceholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f0f0f0',
  },
  placeholderText: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  placeholderSubtext: {
    fontSize: 16,
    color: '#666',
    marginBottom: 8,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  navButton: {
    padding: 8,
    color: '#0066cc',
  },
  disabledButton: {
    color: '#ccc',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  menuContainer: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingVertical: 16,
  },
  menuItem: {
    padding: 16,
  },
  menuText: {
    fontSize: 16,
  },
});
