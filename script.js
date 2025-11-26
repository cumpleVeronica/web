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
        // CONSEJO: Para pruebas, puedes comentar el if/else y entrar directo
        if (dateInput.value === TARGET_DATE) {
            enterSite();
        } else {
            // Pista visual de error
            const errorMsg = document.getElementById('error-msg');
            errorMsg.style.opacity = '1';
        }
    });

    function enterSite() {
        loginScreen.style.opacity = '0';
        setTimeout(() => {
            loginScreen.style.display = 'none';
            mainContent.style.display = 'block';
            loadGalleryFromGitHub(); 
        }, 600);
    }

    // 2. SUBIR FOTO NUEVA
    photoInput.addEventListener('change', async function(e) {
        if (this.files && this.files[0]) {
            await handleUpload(this.files[0], null, null);
            this.value = ''; // Limpiar input para permitir subir la misma foto si se desea
        }
    });

    // --- FUNCIÓN MAESTRA DE SUBIDA ---
    async function handleUpload(file, existingFilename, existingSha) {
        uploadLabel.innerText = "⏳";
        
        const reader = new FileReader();
        reader.readAsDataURL(file);
        
        reader.onload = async function() {
            const base64Content = reader.result.split(',')[1];
            
            // Limpiar nombre de archivo de caracteres raros para evitar errores en URL
            const cleanName = file.name.replace(/[^a-zA-Z0-9._-]/g, '');
            const fileName = existingFilename || `${Date.now()}-${cleanName}`; 
            
            try {
                await uploadToGitHub(fileName, base64Content, existingSha);
                alert(existingSha ? "¡Foto cambiada con éxito!" : "¡Foto subida con éxito!");
                loadGalleryFromGitHub(); 
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
        if (!GITHUB_TOKEN || GITHUB_TOKEN.includes('PEGAR_TU_TOKEN')) {
            throw new Error("Falta configurar el Token de GitHub en script.js");
        }

        const url = `https://api.github.com/repos/${GITHUB_USERNAME}/${REPO_NAME}/contents/${UPLOAD_FOLDER}/${filename}`;
        
        const body = {
            message: sha ? `Actualizando ${filename}` : `Nueva foto: ${filename}`,
            content: content
        };

        if (sha) body.sha = sha;

        const response = await fetch(url, {
            method: 'PUT',
            headers: {
                'Authorization': `token ${GITHUB_TOKEN}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(body)
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(`GitHub Error: ${errorData.message}`);
        }
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
                sha: sha 
            })
        });

        if (!response.ok) throw new Error('No se pudo borrar la imagen');
    }

    async function loadGalleryFromGitHub() {
        gallery.innerHTML = '<p style="text-align:center; width:100%; color:var(--text-light)">Cargando recuerdos...</p>';
        
        // Añadimos timestamp para evitar caché del navegador
        const url = `https://api.github.com/repos/${GITHUB_USERNAME}/${REPO_NAME}/contents/${UPLOAD_FOLDER}?t=${Date.now()}`;
        
        try {
            const response = await fetch(url, {
                headers: { 'Authorization': `token ${GITHUB_TOKEN}` }
            });
            
            // Manejo específico del 404 (Carpeta vacía o no creada)
            if (response.status === 404) {
                gallery.innerHTML = '<p style="text-align:center; width:100%">Aún no hay fotos. ¡Sube la primera!</p>';
                return;
            }

            // Manejo de error de autenticación (401)
            if (response.status === 401) {
                gallery.innerHTML = '<p style="color:red; text-align:center">Error de acceso (401). Verifica tu Token.</p>';
                return;
            }

            const data = await response.json();

            // CORRECCIÓN CRÍTICA: Verificar que data sea un Array antes de usar reverse
            if (!Array.isArray(data)) {
                console.error("Respuesta inesperada de GitHub:", data);
                gallery.innerHTML = '<p style="color:red; text-align:center">Error al leer datos.</p>';
                return;
            }

            gallery.innerHTML = ''; 

            // Filtrar y renderizar
            const images = data.filter(file => file.name.match(/\.(jpg|jpeg|png|gif|webp)$/i));
            
            if (images.length === 0) {
                gallery.innerHTML = '<p style="text-align:center; width:100%">Carpeta encontrada pero sin imágenes válidas.</p>';
                return;
            }

            images.reverse().forEach(file => {
                createPhotoCard(file);
            });

        } catch (error) {
            console.error(error);
            gallery.innerHTML = `<p style="color:red">Error de red: ${error.message}</p>`;
        }
    }

    // --- CREAR TARJETA CON BOTONES ---
    function createPhotoCard(fileData) {
        const div = document.createElement('div');
        div.className = 'photo-card';
        
        const uniqueId = Math.random().toString(36).substr(2, 9);
        
        div.innerHTML = `
            <img src="${fileData.download_url}" loading="lazy" alt="Foto">
            
            <div class="actions-overlay">
                <button class="action-btn btn-swap" onclick="document.getElementById('swap-${uniqueId}').click()">
                    🔄
                </button>
                
                <button class="action-btn btn-delete" onclick="triggerDelete('${fileData.name}', '${fileData.sha}')">
                    🗑️
                </button>
            </div>

            <input type="file" id="swap-${uniqueId}" class="hidden-swap-input" accept="image/*" 
                onchange="triggerSwap(this, '${fileData.name}', '${fileData.sha}')">
        `;
        gallery.append(div);
    }

    // --- EXPORTAR FUNCIONES AL SCOPE GLOBAL ---
    
    window.triggerDelete = async (filename, sha) => {
        if(confirm('¿Seguro que quieres borrar esta foto?')) {
            try {
                // Feedback visual inmediato (opcional)
                gallery.innerHTML = '<p style="text-align:center; width:100%">Actualizando...</p>';
                await deleteFromGitHub(filename, sha);
                loadGalleryFromGitHub(); 
            } catch (e) {
                alert("Error borrando: " + e.message);
                loadGalleryFromGitHub(); // Recargar para restaurar vista
            }
        }
    };

    window.triggerSwap = (inputElement, filename, sha) => {
        if (inputElement.files && inputElement.files[0]) {
            handleUpload(inputElement.files[0], filename, sha);
        }
    };
});
