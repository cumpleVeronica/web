document.addEventListener('DOMContentLoaded', () => {
    
    // --- ⚠️ TUS DATOS AQUÍ ---
    const GITHUB_USERNAME = 'cumpleVeronica'; 
    const REPO_NAME = 'web'; 
    const GITHUB_TOKEN = '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'; 
    // -------------------------

    const TARGET_DATE = '2025-11-28';
    const UPLOAD_FOLDER = 'fotos'; 

    // Referencias DOM
    const loginBtn = document.getElementById('login-btn');
    const dateInput = document.getElementById('date-input');
    const mainContent = document.getElementById('main-content');
    const loginScreen = document.getElementById('login-screen');
    const gallery = document.getElementById('gallery');
    const photoInput = document.getElementById('photo-input');
    const uploadLabel = document.querySelector('.custom-file-upload span');

    // 1. LOGIN
    loginBtn.addEventListener('click', () => {
        if (dateInput.value === TARGET_DATE) {
            loginScreen.style.opacity = '0';
            setTimeout(() => {
                loginScreen.style.display = 'none';
                mainContent.style.display = 'block';
                loadGalleryFromGitHub(); 
            }, 600);
        } else {
            alert("Fecha incorrecta");
        }
    });

    // 2. SUBIR FOTO NUEVA
    photoInput.addEventListener('change', async function(e) {
        if (this.files && this.files[0]) {
            handleUpload(this.files[0], null, null); // Null sha = Archivo nuevo
        }
    });

    // --- FUNCIÓN MAESTRA DE SUBIDA (SIRVE PARA NUEVAS Y PARA INTERCAMBIAR) ---
    async function handleUpload(file, existingFilename, existingSha) {
        uploadLabel.innerText = "⏳";
        
        const reader = new FileReader();
        reader.readAsDataURL(file);
        
        reader.onload = async function() {
            const base64Content = reader.result.split(',')[1];
            // Si es intercambio usamos el nombre viejo, si es nueva creamos uno con timestamp
            const fileName = existingFilename || `${Date.now()}-${file.name}`; 
            
            try {
                await uploadToGitHub(fileName, base64Content, existingSha);
                alert(existingSha ? "¡Foto cambiada!" : "¡Foto subida!");
                loadGalleryFromGitHub(); // Recargar galería
            } catch (error) {
                console.error(error);
                alert("Error: " + error.message);
            } finally {
                uploadLabel.innerText = "+";
            }
        };
    }

    // --- API GITHUB ---

    async function uploadToGitHub(filename, content, sha) {
        const url = `https://api.github.com/repos/${GITHUB_USERNAME}/${REPO_NAME}/contents/${UPLOAD_FOLDER}/${filename}`;
        
        const body = {
            message: sha ? `Actualizando ${filename}` : `Nueva foto: ${filename}`,
            content: content
        };

        // SI HAY SHA, ES UN "UPDATE", GITHUB LO EXIGE
        if (sha) body.sha = sha;

        const response = await fetch(url, {
            method: 'PUT',
            headers: {
                'Authorization': `token ${GITHUB_TOKEN}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(body)
        });

        if (!response.ok) throw new Error('Fallo al subir a GitHub');
    }

    async function deleteFromGitHub(filename, sha) {
        const url = `https://api.github.com/repos/${GITHUB_USERNAME}/${REPO_NAME}/contents/${UPLOAD_FOLDER}/${filename}`;
        
        const response = await fetch(url, {
            method: 'DELETE',
            headers: {
                'Authorization': `token ${GITHUB_TOKEN}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                message: `Borrando foto ${filename}`,
                sha: sha // OBLIGATORIO PARA BORRAR
            })
        });

        if (!response.ok) throw new Error('No se pudo borrar');
    }

    async function loadGalleryFromGitHub() {
        gallery.innerHTML = '<p style="text-align:center; width:100%">Cargando recuerdos...</p>';
        const url = `https://api.github.com/repos/${GITHUB_USERNAME}/${REPO_NAME}/contents/${UPLOAD_FOLDER}`;
        
        try {
            const response = await fetch(url, {
                headers: { 'Authorization': `token ${GITHUB_TOKEN}` }
            });
            
            if (response.status === 404) {
                gallery.innerHTML = '';
                return;
            }

            const data = await response.json();
            gallery.innerHTML = ''; // Limpiar mensaje de carga

            // Renderizar fotos
            data.reverse().forEach(file => {
                if (file.name.match(/\.(jpg|jpeg|png|gif|webp)$/i)) {
                    createPhotoCard(file);
                }
            });

        } catch (error) {
            console.error(error);
        }
    }

    // --- CREAR TARJETA CON BOTONES ---
    function createPhotoCard(fileData) {
        const div = document.createElement('div');
        div.className = 'photo-card';
        
        // Creamos inputs ocultos únicos para cada tarjeta
        const uniqueId = Date.now() + Math.random();
        
        div.innerHTML = `
            <img src="${fileData.download_url}" alt="Foto">
            
            <div class="actions-overlay">
                <!-- Botón Intercambiar -->
                <button class="action-btn btn-swap" onclick="document.getElementById('swap-${uniqueId}').click()">
                    🔄 Cambiar
                </button>
                
                <!-- Botón Eliminar -->
                <button class="action-btn btn-delete" onclick="triggerDelete('${fileData.name}', '${fileData.sha}')">
                    🗑️ Borrar
                </button>
            </div>

            <!-- Input invisible para el intercambio -->
            <input type="file" id="swap-${uniqueId}" class="hidden-swap-input" accept="image/*" 
                onchange="triggerSwap(this, '${fileData.name}', '${fileData.sha}')">
        `;
        gallery.append(div);
    }

    // --- FUNCIONES GLOBALES PARA EL HTML ---
    
    window.triggerDelete = async (filename, sha) => {
        if(confirm('¿Seguro que quieres borrar esta foto permanentemente?')) {
            try {
                await deleteFromGitHub(filename, sha);
                // Eliminar visualmente la tarjeta
                loadGalleryFromGitHub(); // Recargamos para asegurar sincronización
            } catch (e) {
                alert("Error borrando: " + e.message);
            }
        }
    };

    window.triggerSwap = (inputElement, filename, sha) => {
        if (inputElement.files && inputElement.files[0]) {
            // Reutilizamos la función de subida pero pasando el SHA y el nombre viejo
            handleUpload(inputElement.files[0], filename, sha);
        }
    };
});