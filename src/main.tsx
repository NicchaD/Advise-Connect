/**
 * main.tsx - Application Entry Point
 * 
 * OVERVIEW:
 * This is the entry point for the Advise-Connect React application. It initializes
 * the React application and mounts it to the DOM using React 18's createRoot API.
 * 
 * RESPONSIBILITIES:
 * 1. DOM Mounting - Attach React app to the HTML root element
 * 2. Global Styles - Load application-wide CSS styles
 * 3. App Bootstrap - Initialize the main App component
 * 
 * REACT 18 FEATURES:
 * - Uses createRoot API for concurrent features and improved performance
 * - Enables automatic batching and other React 18 optimizations
 * - Provides foundation for future concurrent rendering features
 * 
 * INITIALIZATION FLOW:
 * 1. Import React's createRoot API for modern DOM rendering
 * 2. Import main App component containing all application logic
 * 3. Import global CSS styles (Tailwind + custom styles)
 * 4. Mount App component to DOM element with id="root"
 */

// React 18 DOM Rendering API - Modern React rendering with concurrent features
import { createRoot } from 'react-dom/client'

// Main Application Component - Contains all app logic, routing, and providers
import App from './App.tsx'

// Global Styles - Tailwind CSS base styles and custom application styles
import './index.css'

/**
 * Application Initialization
 * 
 * Creates a React root and renders the main App component into the DOM.
 * The root element is expected to exist in the HTML with id="root".
 * 
 * Uses non-null assertion (!) since we know the root element exists in index.html.
 */
createRoot(document.getElementById("root")!).render(<App />);
