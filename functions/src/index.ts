import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import * as path from "path";

admin.initializeApp()
const db = admin.firestore();

// // Start writing Firebase Functions
// // https://firebase.google.com/docs/functions/typescript
//
// export const helloWorld = functions.https.onRequest((request, response) => {
//   functions.logger.info("Hello logs!", {structuredData: true});
//   response.send("Hello from Firebase!");
// });

async function reconcileMobileUpload(
  file: any,
  sourceData: any,
  sourceRef: any,
  filename:string
) {
  functions.logger.log("Hello ggg:");
  const publicURLs = await file.getSignedUrl({
    action: "read",
    expires: "03-09-2591",
  });

  const publicURL = publicURLs[0];
  functions.logger.log("Hello publicurl:",publicURL);
  // Update the destination Document
  const tmp = sourceData.field_path.split("/");
  const destField = tmp.pop();
  const destPath = tmp.join("/");
  const destRef = db.doc(destPath);
  await destRef.update({
    [destField]: {'name':filename,'publicURL':publicURL},
  });

  // Update the source document
  return sourceRef.update({
    public_url: publicURL,
    upload_complete: true,
  });
}

export const reconcileMobileUploadFromStorage = functions.storage
  .object()
  .onFinalize(async (object: any) => {
    try {
      const filePath = object.name; //mobile-uploads/123abc.jpg
      if (!filePath) {
        return null;
      }
      let slug:string|undefined= '';
      functions.logger.log("Hello from info. Here's an filePath:", filePath);

      // Must be in the mobile—uploads directory
      const fileDir = path.dirname(filePath); // mobile-uploads
      functions.logger.log("Hello from info. Here's an fileDir:", fileDir);

      if(fileDir.includes("/"))
      {
        let res = fileDir.split("/");
        let first = res.shift();

        if (first !== "mobile-uploads") {
          functions.logger.log("Hello from info. Here's an errorrr111111");
          return null; // Quietly ignore anything else
        }
       
         slug = res.shift();
        

      }else{
        if (fileDir !== "mobile-uploads") {
          functions.logger.log("Hello from info. Here's an errorrr");
          return null; // Quietly ignore anything else
        }

      }
     
      functions.logger.log("Hello Here's i am");
    
      // Reference the file
      const bucket = admin.storage().bucket();
      const file = bucket.file(filePath);
      // Read the related Firestore Document (source)
      
     
      const sourceUid = path.parse(filePath).name; // 123abc
     
      functions.logger.log("Hello from info. Here's an sourceUid:", sourceUid);
      let sourcePath ='';
      if(slug === '' || slug === undefined){
         sourcePath = `mobile-uploads/${sourceUid}`;
      }else{
         sourcePath = `mobile-uploads/${slug}/submissionData/${sourceUid}`;
      }
      
      const sourceRef = db.doc(sourcePath);
      const sourceDoc = await sourceRef.get();
      if (!sourceDoc.exists) {
        return null; // The Document is required
      }
      const sourceData = sourceDoc.data();
      if (!sourceData) {
        throw new Error(`Firestore doc '${sourcePath}' missing`);
      }
      if (!sourceData.field_path){
        throw new Error(`Firestore doc '${sourcePath}' missing  field`);
      }
      const filename= sourceUid+sourceData.ext;
     
      // Great
      return reconcileMobileUpload(file, sourceData, sourceRef,filename);
    } catch (error) {
      console.error(error);
      return null;
    }
  });

export const reconcileMobileUploadFromFirestore = functions.firestore
  .document("mobile-uploads/{mobileUploadUid}")
  .onCreate(async (snapshot: any, context: any) => {
    try {
      const sourceRef = snapshot.ref;
      const sourceData = snapshot.data();
      // Do nothing if the 'upload_complete' flag is true
      if (sourceData.upload_complete === true) {
        return null;
      }
      // We must have ext and  field_path
      if (!sourceData.field_path) {
        throw new Error("Firestore doc missing field_path");
      }

      if (!sourceData.ext) {
        throw new Error("Firestore doc missing ext");
      }

      // See if the related file exists

      const fitePath = `mobile-uploads/${snapshot.id}${sourceData.ext}`;
      const bucket = admin.storage().bucket();
      const file = bucket.file(fitePath);
      const fileExists = (await file.exists())[0]; // the promise returv
      if (!fileExists) {
        return null;
      }
      const filename= snapshot.id+sourceData.ext;
      return reconcileMobileUpload(file, sourceData, sourceRef,filename);
    } catch (err) {
      console.error(err);
      return null;
    }
  });


  export const reconcileMobileUploadFromFirestoreUsingSlug = functions.firestore
  .document("mobile-uploads/{slug}/submissionData/{mobileUploadUid}")
  .onCreate(async (snapshot: any, context: any) => {
    try {
      const sourceRef = snapshot.ref;
      const slug= context.params.slug;
      const sourceData = snapshot.data();
      // Do nothing if the 'upload_complete' flag is true
      if (sourceData.upload_complete === true) {
        return null;
      }
      // We must have ext and  field_path
      if (!sourceData.field_path) {
        throw new Error("Firestore doc missing field_path");
      }

      if (!sourceData.ext) {
        throw new Error("Firestore doc missing ext");
      }

      // See if the related file exists

      const fitePath = `mobile-uploads/${slug}/${snapshot.id}${sourceData.ext}`;
      const bucket = admin.storage().bucket();
      const file = bucket.file(fitePath);
      const fileExists = (await file.exists())[0]; // the promise returv
      if (!fileExists) {
        return null;
      }
      const filename= snapshot.id+sourceData.ext;
      return reconcileMobileUpload(file, sourceData, sourceRef,filename);
    } catch (err) {
      console.error(err);
      return null;
    }
  });


  
