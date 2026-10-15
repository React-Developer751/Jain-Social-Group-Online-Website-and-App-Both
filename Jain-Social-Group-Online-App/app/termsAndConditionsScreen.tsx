import React from 'react';
import { ScrollView, Text, View, SafeAreaView, TouchableOpacity } from 'react-native';
import { Colors, BorderRadius } from '@/constants/theme';
import { Ionicons } from '@expo/vector-icons';
import {router} from "expo-router";

export default function TermsAndConditionsScreen() {
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: Colors.white }}>
    {/* Header */}
<View
  style={{
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.gray100,
    backgroundColor: Colors.white,
    flexDirection: 'row',
    alignItems: 'center',
  }}
>

  {/* Back Button */}
  <TouchableOpacity
    onPress={() => router.back()}
    style={{
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: Colors.gray50,
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: 12,
    }}
  >
    <Ionicons
      name="arrow-back"
      size={22}
      color={Colors.gray900}
    />
  </TouchableOpacity>


  {/* Title Area */}
  <View style={{ flex: 1 }}>
    <Text
      style={{
        fontSize: 24,
        fontWeight: '800',
        color: Colors.gray900,
        letterSpacing: -0.5,
      }}
    >
      Jain Social Group Online
    </Text>

    <Text
      style={{
        marginTop: 2,
        fontSize: 15,
        fontWeight: '600',
        color: Colors.gray700,
      }}
    >
      Terms of Service & Community Guidelines
    </Text>

    <Text
      style={{
        marginTop: 4,
        fontSize: 12,
        color: Colors.gray500,
        fontStyle: 'italic',
        fontWeight: '500',
      }}
    >
      Last Updated: July 2026
    </Text>
  </View>

</View>

      <ScrollView
        style={{
          flex: 1,
          paddingHorizontal: 24,
          paddingVertical: 16,
          backgroundColor: Colors.white,
        }}
        showsVerticalScrollIndicator
        contentContainerStyle={{ paddingBottom: 40 }}
      >

        <Text
          style={{
            fontSize: 14,
            lineHeight: 24,
            color: Colors.gray700,
            marginBottom: 24,
          }}
        >
          Welcome to Jain Social Group Online. Our platform allows users to
          register, connect with friends, join groups, share posts, upload
          content, chat with members, and participate in free or paid community
          events. User registration does not provide immediate access; accounts
          must be reviewed and approved by administrators before login access
          is enabled.

          The platform is managed and monitored by administrators to maintain
          community safety, quality, and proper usage.
        </Text>


        {/* Section 1 */}
        <View
          style={{
            marginBottom: 24,
            padding: 16,
            backgroundColor: Colors.gray50,
            borderRadius: BorderRadius.xl,
            borderWidth: 1,
            borderColor: Colors.gray200,
          }}
        >
          <Text style={sectionTitle}>
            1. Community Guidelines & User Generated Content Policy
          </Text>

          <Text style={bodyText}>
            Our platform connects users through posts, comments, media sharing,
            and instant messaging. Users are responsible for maintaining
            respectful interactions and ensuring that their uploaded content
            follows Jain Social Group Online community standards.

            There is strictly{' '}
            <Text style={highlightText}>
              ZERO TOLERANCE
            </Text>{' '}
            for objectionable, abusive, defamatory, obscene, or harassing
            content.
          </Text>


          <Text style={[bodyText,{marginTop:8}]}>
            • Users must not upload adult content, hate speech, bullying
            material, or graphic violence.{"\n"}

            • Users can report offensive content or block abusive members.
            {"\n"}

            • Violating content may be removed after review according to
            platform policies.
          </Text>

        </View>



        {/* Section 2 */}
        <View style={containerStyle}>
          <Text style={headingStyle}>
            2. User Accounts, Friends & Messaging
          </Text>

          <Text style={bodyText}>
            Users can create connections after account approval through friend
            requests, accept or reject requests, and communicate with other
            members through private and group chats.

            Users are responsible for their conversations and interactions.
            Spam, harassment, fake accounts, impersonation, or misuse of
            communication features may result in account restrictions or
            termination.
          </Text>
        </View>



        {/* Section 3 */}
        <View style={cardStyle}>

          <Text style={sectionTitle}>
            3. Groups & Community Participation
          </Text>

          <Text style={bodyText}>
            Users can request to join available groups. Group membership may
            require approval from group administrators.

            Users can participate in group discussions, share content, and
            interact with members according to group rules. Group administrators
            can manage membership and remove users who violate community
            guidelines.
          </Text>

        </View>



        {/* Section 4 */}
        <View style={containerStyle}>

          <Text style={headingStyle}>
            4. Events Marketplace & Ticketing
          </Text>

          <Text style={bodyText}>
            Users may create, publish, and participate in free or paid events.

            Event organizers are responsible for providing accurate event
            information, following applicable rules, and ensuring proper event
            management.

            Paid event payments, cancellations, and refunds are handled
            according to organizer policies. Jain Social Group Online is not
            responsible for disputes between event organizers and participants.
          </Text>

        </View>



        {/* Section 5 */}
        <View style={containerStyle}>

          <Text style={headingStyle}>
            5. Posts, Media & Intellectual Property
          </Text>

          <Text style={bodyText}>
            Users retain ownership of the photos, text, and videos they publish.

            Users are responsible for ensuring that their content does not
            violate copyrights, privacy rights, or applicable laws.

            By uploading content, users grant Jain Social Group Online a
            non-exclusive, royalty-free, worldwide license to host, display,
            and distribute their media only for operating and improving the
            service.
          </Text>

        </View>



        {/* Section 6 */}
        <View style={containerStyle}>

          <Text style={headingStyle}>
            6. Account Approval, Suspension & Termination
          </Text>

          <Text style={bodyText}>
            Jain Social Group Online administrators control account approval,
            access permissions, moderation, and platform safety.

            Administrators may approve, restrict, suspend, or permanently
            terminate accounts that violate these Terms, Community Guidelines,
            or platform policies.
          </Text>

        </View>



        {/* Section 7 */}
        <View style={containerStyle}>

          <Text style={headingStyle}>
            7. Reporting, Blocking & Safety
          </Text>

          <Text style={bodyText}>
            Users can report inappropriate profiles, posts, comments, messages,
            or other content.

            Users can block or unblock other members at any time.

            Reported content may be reviewed and removed if it violates
            platform policies.
          </Text>

        </View>


      </ScrollView>

    </SafeAreaView>
  );
}



const cardStyle = {
  marginBottom:24,
  padding:16,
  backgroundColor:Colors.gray50,
  borderRadius:BorderRadius.xl,
  borderWidth:1,
  borderColor:Colors.gray200,
};


const containerStyle = {
  marginBottom:24,
};


const sectionTitle = {
  fontSize:16,
  fontWeight:'700' as const,
  color:Colors.gray900,
  marginBottom:8,
};


const headingStyle = {
  fontSize:18,
  fontWeight:'700' as const,
  color:Colors.gray900,
  marginBottom:8,
};


const bodyText = {
  fontSize:14,
  lineHeight:24,
  color:Colors.gray700,
};


const highlightText = {
  fontWeight:'800' as const,
  textDecorationLine:'underline' as const,
  color:Colors.gray900,
};