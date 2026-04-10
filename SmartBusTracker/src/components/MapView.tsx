import { Platform } from 'react-native';
import MapViewMobile from './MapView.native';
import MapViewWeb from './MapView.web';

// Standard platform-specific export
const MapView = Platform.OS === 'web' ? MapViewWeb : MapViewMobile;

export default MapView;
