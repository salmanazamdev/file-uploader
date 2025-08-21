import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator, Platform, Alert } from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';
import * as ImagePicker from 'expo-image-picker';
import axios from 'axios';

const UploadFiles = () => {   
  const [fileName, setFileName] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState<string[]>([]);

  const uploadFile = async (name: string, base64: string) => {
    try {
      setUploading(true);
      console.log('Starting upload for:', name);
      console.log('Base64 length:', base64.length);
      
      // Updated the IP as per your system's IP
      const response = await axios.post('http://192.168.100.20:3000/upload', { 
        name, 
        file: base64 
      }, {
        timeout: 30000, // 30 second timeout
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      console.log('Upload response:', response.data);
      alert(response.data.message);
      setUploadedFiles(prev => [...prev, name]);
    } catch (err: any) {
      console.error('Upload error details:', err);
      if (err.response) {
        console.error('Response data:', err.response.data);
        console.error('Response status:', err.response.status);
        alert(`Upload failed! Status: ${err.response.status} - ${err.response.data?.message || err.message}`);
      } else if (err.request) {
        console.error('No response received:', err.request);
        alert('Upload failed! No response from server. Check if server is running.');
      } else {
        console.error('Request setup error:', err.message);
        alert('Upload failed! ' + err.message);
      }
    } finally {
      setUploading(false);
    }
  };

  const pickFile = async () => {
    try {
      console.log('Starting file picker...');
      const res = await DocumentPicker.getDocumentAsync({ 
        type: '*/*',
        copyToCacheDirectory: true // This is important!
      });
      
      console.log('Document picker result:', res);
      
      if (!res.canceled && res.assets && res.assets.length > 0) {
        const asset = res.assets[0];
        setFileName(asset.name);
        console.log('Selected file:', asset.name, 'URI:', asset.uri);
        
        try {
          // Check if we need to handle content:// URIs
          let fileUri = asset.uri;
          
          if (asset.uri.startsWith('content://')) {
            console.log('Content URI detected, copying to cache...');
            // Create a temporary file path
            const cacheDir = FileSystem.cacheDirectory;
            const tempFileName = `temp_${Date.now()}_${asset.name}`;
            const tempFilePath = `${cacheDir}${tempFileName}`;
            
            // Copy the file to cache directory
            await FileSystem.copyAsync({
              from: asset.uri,
              to: tempFilePath
            });
            
            fileUri = tempFilePath;
            console.log('File copied to:', fileUri);
          }
          
          const base64 = await FileSystem.readAsStringAsync(fileUri, { 
            encoding: FileSystem.EncodingType.Base64 
          });
          console.log('File read successfully, base64 length:', base64.length);
          await uploadFile(asset.name, base64);
          
          // Clean up temp file if we created one
          if (fileUri !== asset.uri && fileUri.startsWith(FileSystem.cacheDirectory || '')) {
            try {
              await FileSystem.deleteAsync(fileUri);
              console.log('Temporary file cleaned up');
            } catch (cleanupError) {
              console.warn('Failed to cleanup temp file:', cleanupError);
            }
          }
        } catch (fileReadError) {
          console.error('Error reading file:', fileReadError);
          alert('Error reading file: ' + fileReadError.message);
        }
      } else {
        console.log('File selection cancelled or failed');
      }
    } catch (err: any) {
      console.error('File selection error:', err);
      alert('File selection failed! ' + (err.message || err));
    }
  };

  const takePhoto = async () => {
    try {
      console.log('Requesting camera permissions...');
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission denied', 'Camera access is required.');
        return;
      }
      
      console.log('Launching camera...');
      const res = await ImagePicker.launchCameraAsync({ 
        quality: 0.7, 
        base64: true,
        allowsEditing: false
      });
      
      console.log('Camera result:', res);
      
      if (!res.canceled && res.assets && res.assets.length > 0) {
        const asset = res.assets[0];
        if (asset.base64) {
          const name = `photo_${Date.now()}.jpg`;
          setFileName(name);
          console.log('Photo taken, base64 length:', asset.base64.length);
          await uploadFile(name, asset.base64);
        } else {
          alert('Failed to get photo data');
        }
      }
    } catch (err: any) {
      console.error('Camera error:', err);
      alert('Camera error: ' + (err.message || err));
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Upload Files</Text>

      <TouchableOpacity style={styles.button} onPress={pickFile} disabled={uploading}>
        <Text style={styles.buttonText}>📄 Pick & Upload File</Text>
      </TouchableOpacity>

      <TouchableOpacity style={[styles.button, { backgroundColor: '#4CAF50' }]} onPress={takePhoto} disabled={uploading}>
        <Text style={styles.buttonText}>📸 Take Photo & Upload</Text>
      </TouchableOpacity>

      {uploading && <ActivityIndicator size="large" color="#8875FF" style={{ marginTop: 15 }} />}
      {fileName && <Text style={styles.fileName}>Selected: {fileName}</Text>}

      {uploadedFiles.length > 0 && (
        <View style={styles.uploadedList}>
          <Text style={{ fontWeight: 'bold', marginBottom: 5 }}>Uploaded Files:</Text>
          {uploadedFiles.map((f, i) => (<Text key={i}>• {f}</Text>))}
        </View>
      )}
    </View>
  );
};

export default UploadFiles;

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    justifyContent: 'flex-start',
    alignItems: 'center',
    padding: 20,
    paddingTop: 80,
    backgroundColor: '#f5f5f5',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 30,
  },
  button: {
    width: '80%',
    backgroundColor: '#8875FF',
    padding: 15,
    borderRadius: 12,
    marginBottom: 15,
    alignItems: 'center',
  },
  buttonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
  fileName: {
    marginTop: 10,
    fontSize: 16,
    color: '#333',
    textAlign: 'center',
  },
  uploadedList: {
    marginTop: 25,
    alignSelf: 'stretch',
    paddingHorizontal: 10,
  },
});