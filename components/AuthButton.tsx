// src/components/AuthButton.tsx
import React, { useEffect } from 'react';

interface AuthButtonProps {
  onSuccess: (token: string) => void;
  onError: (error: any) => void;
  clientId: string; // El ID de cliente OAuth 2.0 que obtuviste
}

export const AuthButton: React.FC<AuthButtonProps> = ({ onSuccess, onError, clientId }) => {
  useEffect(() => {
    // Asegúrate de que la librería de Google Sign-In esté cargada
    if (window.google) {
      window.google.accounts.id.initialize({
        client_id: clientId,
        callback: (response: any) => {
          // response.credential contiene el ID token JWT
          if (response.credential) {
            onSuccess(response.credential);
          } else {
            onError(new Error("No se recibió el token de credenciales de Google."));
          }
        },
        cancel_on_tap_outside: false, // Evita que se cierre al hacer clic fuera
      });

      // Renderiza el botón de Google Sign-In
      window.google.accounts.id.renderButton(
        document.getElementById("signInDiv")!, // El elemento HTML donde se renderizará el botón
        { 
          theme: "outline", 
          size: "large", 
          text: "signin_with", 
          shape: "rectangular", 
          width: "250" 
        } // Opciones de estilo del botón
      );

      // También puedes mostrar el "One Tap" si lo prefieres
      // window.google.accounts.id.prompt(); 

    } else {
      console.error("Librería de Google Sign-In no cargada.");
    }
  }, [clientId, onSuccess, onError]); // Se ejecuta cuando clientId, onSuccess o onError cambian

  return (
    <div className="flex justify-center items-center h-full w-full">
      <div id="signInDiv" className="p-4 bg-white rounded-lg shadow-md">
        {/* El botón de Google Sign-In se renderizará aquí */}
      </div>
    </div>
  );
};

// Declaración global para window.google, necesaria para TypeScript
declare global {
  interface Window {
    google: any;
  }
}