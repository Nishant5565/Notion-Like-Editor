// Test function for image upload
// You can use this in your browser console to test the upload functionality

async function testImageUpload() {
  // Create a test file input
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = 'image/*';
  
  return new Promise((resolve) => {
    input.onchange = async (e) => {
      const file = e.target.files[0];
      if (!file) return;
      
      console.log('Testing upload for file:', file.name);
      
      try {
        // Import the upload function (adjust path as needed)
        const { handleImageUpload } = await import('./lib/tiptap-utils');
        
        const url = await handleImageUpload(
          file,
          (progress) => console.log('Upload progress:', progress.progress + '%'),
          new AbortController().signal
        );
        
        console.log('Upload successful! URL:', url);
        resolve(url);
      } catch (error) {
        console.error('Upload failed:', error.message);
        resolve(null);
      }
    };
    
    input.click();
  });
}

// Usage: testImageUpload().then(url => console.log('Final URL:', url));
