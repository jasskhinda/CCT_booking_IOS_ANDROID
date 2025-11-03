import React, { useState, useEffect } from 'react';
import { View, TextInput, ScrollView, TouchableOpacity, Text, StyleSheet } from 'react-native';

const AddressAutocomplete = ({ value, onSelectAddress, placeholder, style }) => {
  const [inputValue, setInputValue] = useState(value || '');
  const [predictions, setPredictions] = useState([]);
  const [showPredictions, setShowPredictions] = useState(false);

  useEffect(() => {
    if (inputValue.length > 2) {
      fetchPredictions(inputValue);
    } else {
      setPredictions([]);
    }
  }, [inputValue]);

  const fetchPredictions = async (input) => {
    try {
      const apiKey = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY;
      const url = `https://maps.googleapis.com/maps/api/place/autocomplete/json?input=${encodeURIComponent(
        input
      )}&components=country:us&key=${apiKey}`;

      console.log('Fetching predictions for:', input);
      const response = await fetch(url);
      const data = await response.json();
      console.log('Predictions response:', data);

      if (data.predictions && data.predictions.length > 0) {
        setPredictions(data.predictions);
        setShowPredictions(true);
      } else if (data.status) {
        console.log('Google Places API status:', data.status);
        if (data.error_message) {
          console.error('Error message:', data.error_message);
        }
        setPredictions([]);
      }
    } catch (error) {
      console.error('Error fetching address predictions:', error);
      setPredictions([]);
    }
  };

  const handleSelectAddress = (prediction) => {
    setInputValue(prediction.description);
    onSelectAddress(prediction.description);
    setPredictions([]);
    setShowPredictions(false);
  };

  return (
    <View style={styles.container}>
      <TextInput
        style={[styles.input, style]}
        value={inputValue}
        onChangeText={(text) => {
          setInputValue(text);
          setShowPredictions(true);
        }}
        placeholder={placeholder}
        onFocus={() => setShowPredictions(true)}
      />
      {showPredictions && predictions.length > 0 && (
        <View style={styles.predictionsContainer}>
          <ScrollView
            keyboardShouldPersistTaps="handled"
            nestedScrollEnabled={true}
          >
            {predictions.map((item) => (
              <TouchableOpacity
                key={item.place_id}
                style={styles.predictionItem}
                onPress={() => handleSelectAddress(item)}
              >
                <Text style={styles.predictionText}>{item.description}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    marginBottom: 15,
  },
  input: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 15,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  predictionsContainer: {
    position: 'absolute',
    top: 55,
    left: 0,
    right: 0,
    backgroundColor: '#fff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
    maxHeight: 200,
    zIndex: 1000,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  predictionItem: {
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  predictionText: {
    fontSize: 14,
    color: '#333',
  },
});

export default AddressAutocomplete;
