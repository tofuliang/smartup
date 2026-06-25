#import <ApplicationServices/ApplicationServices.h>
#import <Carbon/Carbon.h>
#import <Foundation/Foundation.h>

int smartup_ax_trusted(void) {
    return AXIsProcessTrusted() ? 1 : 0;
}

int smartup_ax_prompt(void) {
    NSDictionary *opts = @{ (__bridge NSString *)kAXTrustedCheckOptionPrompt: @YES };
    return AXIsProcessTrustedWithOptions((__bridge CFDictionaryRef)opts) ? 1 : 0;
}

static int smartup_post_right_click(CGPoint point, int clickState) {
    CGEventRef down = CGEventCreateMouseEvent(NULL, kCGEventRightMouseDown, point, kCGMouseButtonRight);
    CGEventRef up = CGEventCreateMouseEvent(NULL, kCGEventRightMouseUp, point, kCGMouseButtonRight);

    if (down == NULL || up == NULL) {
        if (down != NULL) {
            CFRelease(down);
        }
        if (up != NULL) {
            CFRelease(up);
        }
        return 0;
    }

    CGEventSetIntegerValueField(down, kCGMouseEventClickState, clickState);
    CGEventSetIntegerValueField(up, kCGMouseEventClickState, clickState);
    CGEventPost(kCGHIDEventTap, down);
    CGEventPost(kCGHIDEventTap, up);
    CFRelease(down);
    CFRelease(up);
    return 1;
}

int smartup_right_click(double x, double y, int clickCount) {
    CGPoint point = CGPointMake(x, y);
    if (clickCount < 1) {
        return 0;
    }

    for (int i = 1; i <= clickCount; i++) {
        if (!smartup_post_right_click(point, i)) {
            return 0;
        }
    }

    return 1;
}

static BOOL smartup_modifier_flags(NSString *name, CGEventFlags *flags) {
    NSString *lower = [name lowercaseString];
    if ([lower isEqualToString:@"ctrl"] || [lower isEqualToString:@"control"]) {
        *flags |= kCGEventFlagMaskControl;
        return YES;
    }
    if ([lower isEqualToString:@"shift"]) {
        *flags |= kCGEventFlagMaskShift;
        return YES;
    }
    if ([lower isEqualToString:@"alt"] || [lower isEqualToString:@"option"]) {
        *flags |= kCGEventFlagMaskAlternate;
        return YES;
    }
    if ([lower isEqualToString:@"cmd"] || [lower isEqualToString:@"command"] || [lower isEqualToString:@"meta"] || [lower isEqualToString:@"super"]) {
        *flags |= kCGEventFlagMaskCommand;
        return YES;
    }
    return NO;
}

static BOOL smartup_key_code_for_name(NSString *name, CGKeyCode *code) {
    NSString *lower = [name lowercaseString];

    if ([lower length] == 1) {
        unichar ch = [lower characterAtIndex:0];
        switch (ch) {
            case 'a': *code = kVK_ANSI_A; return YES;
            case 'b': *code = kVK_ANSI_B; return YES;
            case 'c': *code = kVK_ANSI_C; return YES;
            case 'd': *code = kVK_ANSI_D; return YES;
            case 'e': *code = kVK_ANSI_E; return YES;
            case 'f': *code = kVK_ANSI_F; return YES;
            case 'g': *code = kVK_ANSI_G; return YES;
            case 'h': *code = kVK_ANSI_H; return YES;
            case 'i': *code = kVK_ANSI_I; return YES;
            case 'j': *code = kVK_ANSI_J; return YES;
            case 'k': *code = kVK_ANSI_K; return YES;
            case 'l': *code = kVK_ANSI_L; return YES;
            case 'm': *code = kVK_ANSI_M; return YES;
            case 'n': *code = kVK_ANSI_N; return YES;
            case 'o': *code = kVK_ANSI_O; return YES;
            case 'p': *code = kVK_ANSI_P; return YES;
            case 'q': *code = kVK_ANSI_Q; return YES;
            case 'r': *code = kVK_ANSI_R; return YES;
            case 's': *code = kVK_ANSI_S; return YES;
            case 't': *code = kVK_ANSI_T; return YES;
            case 'u': *code = kVK_ANSI_U; return YES;
            case 'v': *code = kVK_ANSI_V; return YES;
            case 'w': *code = kVK_ANSI_W; return YES;
            case 'x': *code = kVK_ANSI_X; return YES;
            case 'y': *code = kVK_ANSI_Y; return YES;
            case 'z': *code = kVK_ANSI_Z; return YES;
            case '0': *code = kVK_ANSI_0; return YES;
            case '1': *code = kVK_ANSI_1; return YES;
            case '2': *code = kVK_ANSI_2; return YES;
            case '3': *code = kVK_ANSI_3; return YES;
            case '4': *code = kVK_ANSI_4; return YES;
            case '5': *code = kVK_ANSI_5; return YES;
            case '6': *code = kVK_ANSI_6; return YES;
            case '7': *code = kVK_ANSI_7; return YES;
            case '8': *code = kVK_ANSI_8; return YES;
            case '9': *code = kVK_ANSI_9; return YES;
        }
    }

    if ([lower isEqualToString:@"space"]) { *code = kVK_Space; return YES; }
    if ([lower isEqualToString:@"enter"] || [lower isEqualToString:@"return"]) { *code = kVK_Return; return YES; }
    if ([lower isEqualToString:@"tab"]) { *code = kVK_Tab; return YES; }
    if ([lower isEqualToString:@"esc"] || [lower isEqualToString:@"escape"]) { *code = kVK_Escape; return YES; }
    if ([lower isEqualToString:@"delete"] || [lower isEqualToString:@"backspace"]) { *code = kVK_Delete; return YES; }
    if ([lower isEqualToString:@"up"]) { *code = kVK_UpArrow; return YES; }
    if ([lower isEqualToString:@"down"]) { *code = kVK_DownArrow; return YES; }
    if ([lower isEqualToString:@"left"]) { *code = kVK_LeftArrow; return YES; }
    if ([lower isEqualToString:@"right"]) { *code = kVK_RightArrow; return YES; }
    return NO;
}

int smartup_key_press(const char *modifiersCsv, const char *keyName) {
    if (keyName == NULL) {
        return 0;
    }

    NSString *keyString = [NSString stringWithUTF8String:keyName];
    if (keyString == nil) {
        return 0;
    }

    CGKeyCode keyCode;
    if (!smartup_key_code_for_name(keyString, &keyCode)) {
        return 0;
    }

    CGEventFlags flags = 0;
    if (modifiersCsv != NULL) {
        NSString *modifiersString = [NSString stringWithUTF8String:modifiersCsv];
        if (modifiersString != nil && [modifiersString length] > 0) {
            NSArray<NSString *> *parts = [modifiersString componentsSeparatedByString:@","];
            for (NSString *part in parts) {
                smartup_modifier_flags(part, &flags);
            }
        }
    }

    CGEventRef down = CGEventCreateKeyboardEvent(NULL, keyCode, true);
    CGEventRef up = CGEventCreateKeyboardEvent(NULL, keyCode, false);
    if (down == NULL || up == NULL) {
        if (down != NULL) {
            CFRelease(down);
        }
        if (up != NULL) {
            CFRelease(up);
        }
        return 0;
    }

    CGEventSetFlags(down, flags);
    CGEventSetFlags(up, flags);
    CGEventPost(kCGHIDEventTap, down);
    CGEventPost(kCGHIDEventTap, up);
    CFRelease(down);
    CFRelease(up);
    return 1;
}
