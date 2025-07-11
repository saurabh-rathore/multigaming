import 'package:flutter/foundation.dart';

@immutable
class User {
  final String id;
  final String email;
  final String? phone;
  final String status;
  final bool phoneVerified;
  final bool isOtpEnabled;
  final DateTime? createdAt;
  final DateTime? updatedAt;

  const User({
    required this.id,
    required this.email,
    this.phone,
    required this.status,
    required this.phoneVerified,
    required this.isOtpEnabled,
    this.createdAt,
    this.updatedAt,
  });

  factory User.fromJson(Map<String, dynamic> json) {
    return User(
      id: json['id'] as String,
      email: json['email'] as String,
      phone: json['phone'] as String?,
      status: json['status'] as String,
      phoneVerified: json['phone_verified'] as bool? ?? false,
      isOtpEnabled: json['is_otp_enabled'] as bool? ?? false,
      createdAt: json['created_at'] != null
          ? DateTime.tryParse(json['created_at'] as String)
          : null,
      updatedAt: json['updated_at'] != null
          ? DateTime.tryParse(json['updated_at'] as String)
          : null,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'email': email,
      'phone': phone,
      'status': status,
      'phone_verified': phoneVerified,
      'is_otp_enabled': isOtpEnabled,
      'created_at': createdAt?.toIso8601String(),
      'updated_at': updatedAt?.toIso8601String(),
    };
  }

  User copyWith({
    String? id,
    String? email,
    String? phone,
    String? status,
    bool? phoneVerified,
    bool? isOtpEnabled,
    DateTime? createdAt,
    DateTime? updatedAt,
  }) {
    return User(
      id: id ?? this.id,
      email: email ?? this.email,
      phone: phone ?? this.phone,
      status: status ?? this.status,
      phoneVerified: phoneVerified ?? this.phoneVerified,
      isOtpEnabled: isOtpEnabled ?? this.isOtpEnabled,
      createdAt: createdAt ?? this.createdAt,
      updatedAt: updatedAt ?? this.updatedAt,
    );
  }
}
