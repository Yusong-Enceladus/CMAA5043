# BrickBuddy — AI-Powered LEGO Robot Building Assistant

**CMAA5043 Final Project** | Yusong, Jiayi

## Overview
BrickBuddy is an interactive AI assistant that helps children aged 6-8 build LEGO robots through multimodal voice and image interaction, providing personalized step-by-step guidance with integrated STEAM education and emotional support.

## Features
- **Multimodal Input**: Voice (Web Speech API), Camera (getUserMedia), Template selection
- **3-Stage Guided Flow**: Imagine -> Build -> Learn
- **Real-time AI Chat**: Context-aware responses tagged with STEAM categories
- **Emotional Support**: Encouragement banners at challenging build steps
- **STEAM Education**: Science, Technology, Engineering, Art, Math Q&A cards
- **3 Robot Models**: Dog, Car, Dinosaur with step-by-step instructions

## Tech Stack
- React 19 + Vite
- Web Speech API (voice recognition)
- MediaDevices API (camera access)
- Context API (global state management)
- Custom Hooks (useSpeechRecognition, useCamera)

## Setup
```bash
npm install
npm run dev
```

## GitHub
https://github.com/Yusong-Enceladus/CMAA5043
