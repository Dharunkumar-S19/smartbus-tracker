import MapViewMobile from './MapView.native';
import MapViewWeb from './MapView.web';
import { Platform } from 'react-native';

// Standard platform-specific export
const MapView = Platform.OS === 'web' ? MapViewWeb : MapViewMobile;

export default MapView;
