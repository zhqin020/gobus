Below is a concise **App Requirements Document (ARD)** for your public transit app targeting Toronto (TTC) and Vancouver (TransLink), designed for publication on Google Play. The document is based on your responses and my recommendations, focusing on functionality, data sources, and Google Play compliance while keeping costs and complexity low. It includes functional and non-functional requirements, data sources, and key considerations for development and deployment.

---

# Public Transit App Requirements Document

**App Name**: TBD (to comply with Google Play keyword policies)  
**Target Platform**: Android (Google Play Store)  
**Target Cities**: Toronto (TTC), Vancouver (TransLink)  
**Objective**: Provide an easy-to-use app for querying city-specific transit information (buses, subways, streetcars, SkyTrain, SeaBus) by route number, including schedules, stop names, and transfer points, with offline support.  
**Document Date**: June 29, 2025  
**Version**: 1.0

---

## 1. Overview
The app enables users in Toronto and Vancouver to query public transit information by entering a route number or transit name (e.g., TTC’s 501 Queen streetcar). It displays route details, start/end times, all stops, transfer points, and static subway maps/schedules. The app supports offline functionality for schedules and maps, multi-language support (English, optional French), and integrates Google Maps for visualization. It aims to differentiate from competitors like Google Maps through ease of use, route number search, and offline access.

---

## 2. Functional Requirements

### 2.1 Core Features
1. **Route Search**:
   - Users input a route number or transit name (e.g., “501 Queen” for TTC, “99 B-Line” for TransLink).
   - Display route details, including:
     - All stops along the route.
     - First and last trip times for weekdays, weekends, and holidays.
     - Transfer points to other bus, subway, streetcar, or SkyTrain/SeaBus lines.
   - Source: GTFS `routes.txt`, `stops.txt`, `trips.txt`, and `transfers.txt`.

2. **Subway/Transit System Information**:
   - Display static subway/SkyTrain maps and schedules for TTC (Toronto) and TransLink (Vancouver).
   - No real-time service alerts (e.g., delays, closures).
   - Source: GTFS `stops.txt` and `calendar.txt` for schedules; static map images from TTC/TransLink websites.

3. **Offline Support**:
   - Cache route schedules, stop names, and transfer data locally for offline access.
   - Cache map tiles for offline visualization (using Google Maps SDK or static images).
   - Display static schedules when no network is available; limit real-time data (e.g., next bus arrival) to online mode.

4. **Map Visualization**:
   - Integrate Google Maps SDK for Android to display routes and stops visually.
   - Show user’s location (if permission granted) to highlight nearby stops.
   - Cache map tiles for offline use.

5. **Multi-Language Support**:
   - Support English as the primary language.
   - Include French strings (`res/values-fr`) for optional bilingual support, preparing for future expansion to Montreal.
   - Use Android’s resource system to switch languages based on device settings.

### 2.2 Additional Features
- **Favorite Routes**: Allow users to save frequently used routes locally for quick access.
- **Data Attribution**: Display required attribution for TTC and TransLink data in the app’s UI (e.g., “About” or “Data Sources” section).
  - TTC: “Route and arrival data provided by permission of Toronto Transit Commission.”
  - TransLink: “Route and arrival data used in this product or service is provided by permission of TransLink. TransLink assumes no responsibility for the accuracy or currency of the Data used in this product or service.”

### 2.3 Exclusions
- No fare information or integration with payment systems (e.g., Presto, Compass).
- No real-time service alerts (e.g., delays, closures).
- No intercity transit (e.g., GO Transit, Via Rail).
- No in-app purchases or ads.

---

## 3. Non-Functional Requirements

### 3.1 Performance
- **Data Updates**: Fetch GTFS updates weekly (TTC/TransLink release schedules weekly). Poll GTFS Realtime feeds every 30–60 seconds when online for next arrival times.
- **Battery Efficiency**: Minimize battery usage by limiting real-time data fetches (e.g., only when app is active).
- **Startup Time**: App should launch within 2 seconds on devices running Android 8.0+.
- **Offline Reliability**: Cached GTFS data and map tiles must support full route lookup without internet.

### 3.2 Compatibility
- **Android Version**: Support Android 8.0 (API level 26) and above (devices released after 2018).
- **Device Support**: Compatible with various screen sizes and resolutions (test via Android Studio emulator).
- **Google Play Standards**: Meet performance standards (no crashes, reasonable battery usage).

### 3.3 Security and Privacy
- **Permissions**: Request `ACCESS_FINE_LOCATION` for map visualization, with a clear prompt (e.g., “Location access is used to show nearby stops”).
- **Data Privacy**: No user data collection. Cache transit data locally on the device only. Include a privacy policy stating: “No personal data is collected or shared; transit data is cached locally.”
- **Data Security**: Use HTTPS for GTFS Realtime API calls to ensure secure data transfer.

### 3.4 Usability
- **Ease of Use**: Simple UI for route number input, with clear display of stops, schedules, and transfers.
- **Accessibility**: Support large text and high-contrast modes for accessibility.
- **Language**: English required; French optional for future Montreal expansion.

---

## 4. Data Sources

### 4.1 Static Data (GTFS)
- **Toronto (TTC)**:
  - **Source**: TTC Open Data Portal ([ttc.ca](https://www.ttc.ca/about-the-ttc/Open_Data_Portal)).
  - **Content**: Routes, stops, schedules, and transfer points for buses, subways, and streetcars.
  - **Cost**: Free (Creative Commons Attribution 4.0 License).
  - **Update Frequency**: Weekly or when schedules change.
  - **Implementation**: Download `.zip` file, parse with `gtfs-realtime-bindings` (Java/Kotlin), store in SQLite database for offline use.
- **Vancouver (TransLink)**:
  - **Source**: TransLink Developer Resources ([translink.ca](https://www.translink.ca/about-us/doing-business-with-translink/app-developer-resources)).
  - **Content**: Routes, stops, schedules, and transfer points for buses, SkyTrain, and SeaBus.
  - **Cost**: Free (Creative Commons Attribution 4.0 License; commercial use may require additional terms if monetized later).
  - **Update Frequency**: Weekly (new `.zip` files posted by Friday).
  - **Implementation**: Same as TTC.

### 4.2 Real-Time Data (GTFS Realtime)
- **Toronto (TTC)**:
  - **Source**: TTC Open Data Portal (URL provided after registration).
  - **Content**: Trip updates and vehicle positions (no service alerts, per requirements).
  - **Cost**: Free (Creative Commons Attribution 4.0 License).
  - **Access**: HTTP GET requests, Protobuf format, parsed with `gtfs-realtime-bindings`.
- **Vancouver (TransLink)**:
  - **Source**: [gtfsrt.api.translink.com.au](https://gtfsrt.api.translink.com.au).
  - **Content**: Trip updates and vehicle positions (no service alerts).
  - **Cost**: Free (Creative Commons Attribution 4.0 License).
  - **Access**: Public URL, no authentication, Protobuf format.

### 4.3 Map Visualization
- **Source**: Google Maps SDK for Android ([cloud.google.com/maps-platform](https://cloud.google.com/maps-platform)).
- **Cost**: Free tier for basic map display (no transit-specific APIs).
- **Usage**: Display routes/stops on an interactive map; cache tiles for offline use.

### 4.4 Licensing and Attribution
- **TTC**: Attribute in UI: “Route and arrival data provided by permission of Toronto Transit Commission.”
- **TransLink**: Attribute in UI: “Route and arrival data used in this product or service is provided by permission of TransLink. TransLink assumes no responsibility for the accuracy or currency of the Data used in this product or service.”
- **Action**: Include attributions in app’s “About” or “Data Sources” section and Google Play Store listing.

---

## 5. Google Play Publishing Requirements

### 5.1 Content and Policies
- **Compliance**: Adhere to Google Play Developer Program Policies ([developer.android.com/distribute](https://developer.android.com/distribute)).
  - No misleading claims about data accuracy (e.g., clarify reliance on TTC/TransLink feeds).
  - No user data collection; include privacy policy stating local caching only.
- **Monetization**: No ads or in-app purchases.

### 5.2 Store Listing
- **Assets**:
  - 512x512 app icon.
  - High-quality screenshots (use Android Studio’s screenshot tool).
  - Feature graphic for Google Play.
- **Description**: “Easily search TTC and TransLink routes by number, view schedules, stops, and transfers, with offline support.”
- **Keywords**: Avoid spamming (e.g., don’t overuse “transit” or “TTC”).
- **Category**: Transportation.

### 5.3 Technical Requirements
- **Minimum Android Version**: Android 8.0 (API level 26).
- **Testing**: Test on multiple devices (via emulator) for screen size/resolution compatibility.
- **Performance**: No crashes, optimize battery usage (e.g., limit real-time data fetches).
- **App Signing**: Sign APK or App Bundle via Android Studio for submission.

### 5.4 Testing and Deployment
- **Beta Testing**: Use Google Play Console for closed beta testing to gather feedback.
- **Submission**: Submit via Google Play Console, ensuring signed APK/App Bundle and complete store listing.

---

## 6. Development Considerations

### 6.1 Technical Stack
- **Language**: Java or Kotlin for Android.
- **Libraries**:
  - `gtfs-realtime-bindings` for parsing GTFS and GTFS Realtime data.
  - Google Maps SDK for Android for map visualization.
  - SQLite for local data storage (offline schedules).
- **Tools**: Android Studio for development, testing, and emulator support.
- **Background Tasks**: Use Android WorkManager for weekly GTFS updates and periodic real-time data fetches.

### 6.2 Data Handling
- **Offline**: Store GTFS data in SQLite for route lookup and schedules. Cache map tiles via Google Maps SDK.
- **Online**: Fetch GTFS Realtime feeds every 30–60 seconds for next arrival times.
- **Validation**: Use Google’s Transit Feed Validator to check GTFS data quality.
- **Fallback**: Display cached static schedules if real-time data or network is unavailable.

### 6.3 Maintenance
- **Data Updates**: Check TTC/TransLink URLs weekly for new GTFS `.zip` files. Automate via WorkManager.
- **App Updates**: Use Google Play’s auto-update feature for bug fixes and new versions.
- **Monitoring**: Track user feedback via Google Play reviews to address bugs or feature requests.

---

## 7. Competitive Differentiation
- **Unique Features**:
  - Search by route number (not supported by Google Maps).
  - Offline support for schedules and maps.
  - Simple, intuitive UI for quick route lookup.
- **Competitors**: Google Maps, Transit App.
  - Google Maps lacks route number search and offline transit data.
  - Transit App focuses on real-time data but requires internet.

---

## 8. Risks and Mitigation
- **Data Inconsistencies**:
  - **Risk**: TTC/TransLink feeds may have errors or delays.
  - **Mitigation**: Validate GTFS data, use cached schedules as fallback, include disclaimer about data accuracy.
- **Google Play Rejection**:
  - **Risk**: Non-compliance with policies (e.g., missing privacy policy).
  - **Mitigation**: Review policies, include clear privacy policy, test thoroughly.
- **Cost Overruns**:
  - **Risk**: Using Google Maps APIs for transit data could incur costs.
  - **Mitigation**: Rely on free TTC/TransLink feeds; use Google Maps SDK only for free map display.
- **User Adoption**:
  - **Risk**: Low adoption due to competition.
  - **Mitigation**: Emphasize offline support and ease of use in marketing; gather beta feedback to refine UI.

---

## 9. Next Steps
1. **Data Setup**:
   - Register at TTC Open Data Portal ([ttc.ca](https://www.ttc.ca)) and TransLink Developer Resources ([translink.ca](https://www.translink.ca)).
   - Download and test GTFS/GTFS Realtime feeds.
2. **Development**:
   - Build route search using GTFS data and SQLite.
   - Integrate Google Maps SDK for visualization.
   - Implement English (and optional French) support.
3. **Testing**:
   - Test on Android emulator for multiple devices.
   - Conduct closed beta via Google Play Console.
4. **Google Play Preparation**:
   - Draft privacy policy and store listing assets.
   - Sign APK/App Bundle and submit via Google Play Console.

---

## 10. Future Considerations
- **iOS Version**: Develop for iOS if app gains traction, using same GTFS feeds.
- **City Expansion**: Add Montreal (STM) with French support and GTFS data from [stm.info](https://www.stm.info/fr/a-propos/developpeurs).
- **Feature Expansion**: Consider adding fare info or favorite routes sync across devices (if user data collection is added, update privacy policy).

---

This ARD provides a clear roadmap for your app’s development and deployment. If you need assistance with specific tasks (e.g., GTFS parsing code, UI wireframes, or Google Play Console setup), let me know, and I can provide detailed guidance or examples!