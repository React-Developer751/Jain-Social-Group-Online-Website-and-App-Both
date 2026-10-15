import React, { useState } from "react";
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  TextInput,
  Alert,
  StyleSheet,
  Pressable,
  ActivityIndicator,
} from "react-native";
import { X, Flag } from "lucide-react-native";
import { Colors, BorderRadius, Typography } from "@/constants/theme";
import {createReport} from "@/service/report";
import AsyncStorage from "@react-native-async-storage/async-storage";

interface ReportModalProps {
  visible: boolean;
  onClose: () => void;
  initialData:any;
  /** Called after a successful report so the caller can drop the content. */
  onReported?: () => void;
}

const reportReasons = [
  "Spam",
  "Fake Profile",
  "Harassment or Bullying",
  "Inappropriate Content",
  "Hate Speech",
  "Violence or Threats",
  "Other",
];

export default function ReportModal({
  visible,
  onClose,
  initialData,
  onReported
}: ReportModalProps) {

  const [selectedReason, setSelectedReason] = useState("");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async() => {
    const userData = await AsyncStorage.getItem("user");
    const reportedBy = userData ? JSON.parse(userData)?._id : null;
    if (!selectedReason) return;
    const obj = {   reportedBy: reportedBy,
        reportedUser: initialData?.user?._id,
        reportType: initialData?.reportType,
        reportedItemId: initialData?._id,
        reason: selectedReason,
        description: description,
}; 
    try{
        setLoading(true);
        const res = await createReport(obj);
        if(res.status === 201){
            Alert.alert(
              "Report submitted",
              res?.data?.message ||
                "This content has been hidden from your feed and our team will review it within 24 hours."
            );
         setSelectedReason("");
         setDescription("");
         onReported?.();
         onClose();
        }
    }
    catch(err:any){
    Alert.alert("Report Send Failed.", err?.response?.data?.message || err?.message)
    }finally{
        setLoading(false);
    }
  };


  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >

      <Pressable 
        style={styles.overlay}
        onPress={onClose}
      >

        <Pressable 
          style={styles.card}
          onPress={(e)=>e.stopPropagation()}
        >

          {/* Header */}
          <View style={styles.header}>

            <View style={styles.titleRow}>
              <Flag 
                size={22}
                color={Colors.primary}
              />

              <Text style={styles.title}>
                Report Content
              </Text>
            </View>


            <TouchableOpacity onPress={onClose}>
              <X 
                size={22}
                color={Colors.gray500}
              />
            </TouchableOpacity>

          </View>


          <Text style={styles.subtitle}>
            Help us keep Jain Social Group Online safe.
            Select a reason for reporting.
          </Text>


          {/* Reasons */}

          <Text style={styles.label}>
            Select Reason
          </Text>


          <View style={styles.options}>

          {
            reportReasons.map((item)=>(
              
              <TouchableOpacity
                key={item}
                style={[
                  styles.option,
                  selectedReason === item &&
                  styles.selectedOption
                ]}
                onPress={()=>
                  setSelectedReason(item)
                }
              >

                <View
                  style={[
                    styles.radio,
                    selectedReason === item &&
                    styles.radioActive
                  ]}
                />

                <Text
                  style={[
                    styles.optionText,
                    selectedReason === item &&
                    styles.selectedText
                  ]}
                >
                  {item}
                </Text>


              </TouchableOpacity>

            ))
          }

          </View>


          {/* Description */}

          <Text style={styles.label}>
            Additional Details (Optional)
          </Text>


          <TextInput
            style={styles.input}
            placeholder="Describe the issue..."
            placeholderTextColor={Colors.gray500}
            multiline
            numberOfLines={4}
            value={description}
            onChangeText={setDescription}
          />


          {/* Submit */}

          <TouchableOpacity
            disabled={!selectedReason || loading}
            style={[
              styles.submit,
              !selectedReason &&
              styles.disabled
            ]}
            onPress={handleSubmit}
          >
           {loading ? <ActivityIndicator size={16} color={"white"} />
           :
            <Text style={styles.submitText}>
              Submit Report
            </Text>}

          </TouchableOpacity>


        </Pressable>


      </Pressable>


    </Modal>
  );
}



const styles = StyleSheet.create({

overlay:{
  flex:1,
  backgroundColor:"rgba(0,0,0,0.45)",
  justifyContent:"center",
  alignItems:"center",
  paddingHorizontal:20,
},


card:{
  width:"100%",
  backgroundColor:Colors.white,
  borderRadius:BorderRadius.xl,
  padding:20,
  maxHeight:"85%",
},


header:{
 flexDirection:"row",
 justifyContent:"space-between",
 alignItems:"center",
 marginBottom:12,
},


titleRow:{
 flexDirection:"row",
 alignItems:"center",
 gap:8,
},


title:{
 fontSize:20,
 fontWeight:"700",
 color:Colors.gray900,
},


subtitle:{
 fontSize:14,
 lineHeight:20,
 color:Colors.gray600,
 marginBottom:18,
},


label:{
 fontSize:14,
 fontWeight:"700",
 color:Colors.gray900,
 marginBottom:10,
},


options:{
 gap:10,
 marginBottom:18,
},


option:{
 flexDirection:"row",
 alignItems:"center",
 padding:12,
 borderRadius:BorderRadius.lg,
 borderWidth:1,
 borderColor:Colors.gray200,
},


selectedOption:{
 borderColor:Colors.primary,
 backgroundColor:"#F5F7FF",
},


radio:{
 width:16,
 height:16,
 borderRadius:8,
 borderWidth:2,
 borderColor:Colors.gray400,
 marginRight:10,
},


radioActive:{
 borderColor:Colors.primary,
 backgroundColor:Colors.primary,
},


optionText:{
 fontSize:14,
 color:Colors.gray700,
},


selectedText:{
 color:Colors.gray900,
 fontWeight:"600",
},


input:{
 height:90,
 borderWidth:1,
 borderColor:Colors.gray200,
 borderRadius:BorderRadius.lg,
 padding:12,
 textAlignVertical:"top",
 color:Colors.gray900,
 marginBottom:18,
},


submit:{
 backgroundColor:Colors.primary,
 paddingVertical:14,
 borderRadius:BorderRadius.xl,
 alignItems:"center",
},


disabled:{
 opacity:0.5,
},


submitText:{
 color:"#fff",
 fontSize:15,
 fontWeight:"700",
},


});