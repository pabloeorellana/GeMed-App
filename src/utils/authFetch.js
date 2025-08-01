const getAuthToken = () => {
    return localStorage.getItem('authToken') || sessionStorage.getItem('authToken');
};

const API_URL = import.meta.env.VITE_API_URL; // <<<--- LEER LA VARIABLE DE ENTORNO

const authFetch = async (endpoint, options = {}) => {
    const token = getAuthToken();
    const url = `${API_URL}${endpoint}`;
    const isFormData = options.body instanceof FormData;
    const headers = {
        ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
        ...options.headers,
    };

    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }
    if (isFormData) {
        delete headers['Content-Type'];
    }

    try {
        const response = await fetch(url, {
            ...options,
            headers,
        });

        if (response.status === 401) {
            console.error("authFetch: No autorizado o token expirado. Redirigiendo a login.");
            localStorage.removeItem('authToken');
            localStorage.removeItem('userData');
            sessionStorage.removeItem('authToken');
            sessionStorage.removeItem('userData');
            // Disparar un evento personalizado o usar el contexto para un logout global es mejor
            // que window.location.href si estás dentro de componentes React que pueden manejar el estado.
            // Por ahora, esto fuerza la recarga, lo que también limpiará el estado de React.
            window.location.href = '/profesional/login'; // Ajusta si la ruta de login es diferente
            throw new Error('No autorizado');
        }

        if (!response.ok) {
            // Intenta parsear el error del backend si es JSON, sino usa el statusText
            let errorData;
            try {
                errorData = await response.json();
            } catch (e) {
                errorData = { message: response.statusText || `Error del servidor ${response.status}` };
            }
            throw new Error(errorData.message || `Error ${response.status}`);
        }

        if (response.status === 204) { // No Content
            return null;
        }
        // Si el Content-Type es application/json, intenta parsear, sino devuelve la respuesta tal cual
        const contentType = response.headers.get("content-type");
        if (contentType && contentType.indexOf("application/json") !== -1) {
            return response.json();
        } else {
            return response; // O response.text() si esperas texto
        }

    } catch (error) {
        console.error(`Error en authFetch para ${url}:`, error);
        throw error;
    }
};

export default authFetch;