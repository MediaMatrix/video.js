/**
 * @file text-track-menu-item.js
 */
import MenuItem from '../../menu/menu-item.js';
import Component from '../../component.js';
import window from 'global/window';
import document from 'global/document';

/**
 * The specific menu item type for selecting a language within a text track kind
 *
 * @extends MenuItem
 */
class TextTrackMenuItem extends MenuItem {

  /**
   * Creates an instance of this class.
   *
   * @param {Player} player
   *        The `Player` that this class should be attached to.
   *
   * @param {Object} [options]
   *        The key/value store of player options.
   */
  constructor(player, options) {
    const track = options.track;
    const tracks = player.textTracks();

    // Modify options for parent MenuItem class's init.
    options.label = track.label || track.language || 'Unknown';
    options.selected = track.mode === 'showing';

    super(player, options);

    this.track = track;
    const changeHandler = (...args) => {
      this.handleTracksChange.apply(this, args);
    };
    const selectedLanguageChangeHandler = (...args) => {
      this.handleSelectedLanguageChange.apply(this, args);
    };

    player.on(['loadstart', 'texttrackchange'], changeHandler);
    tracks.addEventListener('change', changeHandler);
    tracks.addEventListener('selectedlanguagechange', selectedLanguageChangeHandler);
    this.on('dispose', function() {
      player.off(['loadstart', 'texttrackchange'], changeHandler);
      tracks.removeEventListener('change', changeHandler);
      tracks.removeEventListener('selectedlanguagechange', selectedLanguageChangeHandler);
    });

    // iOS7 doesn't dispatch change events to TextTrackLists when an
    // associated track's mode changes. Without something like
    // Object.observe() (also not present on iOS7), it's not
    // possible to detect changes to the mode attribute and polyfill
    // the change event. As a poor substitute, we manually dispatch
    // change events whenever the controls modify the mode.
    if (tracks.onchange === undefined) {
      let event;

      this.on(['tap', 'click'], function() {
        if (typeof window.Event !== 'object') {
          // Android 2.3 throws an Illegal Constructor error for window.Event
          try {
            event = new window.Event('change');
          } catch (err) {
            // continue regardless of error
          }
        }

        if (!event) {
          event = document.createEvent('Event');
          event.initEvent('change', true, true);
        }

        tracks.dispatchEvent(event);
      });
    }

    // set the default state based on current tracks
    this.handleTracksChange();
  }

  /**
   * This gets called when an `TextTrackMenuItem` is "clicked". See
   * {@link ClickableComponent} for more detailed information on what a click can be.
   *
   * @param {EventTarget~Event} event
   *        The `keydown`, `tap`, or `click` event that caused this function to be
   *        called.
   *
   * @listens tap
   * @listens click
   */
  handleClick(event) {
    const kind = this.track.kind;
    let kinds = this.track.kinds;
    const tracks = this.player_.textTracks();

    if (!kinds) {
      kinds = [kind];
    }

    super.handleClick(event);

    if (!tracks) {
      return;
    }

    for (let i = 0; i < tracks.length; i++) {
      const track = tracks[i];

      if (track === this.track && (kinds.indexOf(track.kind) > -1)) {
        if (track.mode !== 'showing') {
          track.mode = 'showing';
        }
      } else if (track.mode !== 'disabled') {
        track.mode = 'disabled';
      }
    }
  }

  /**
   * Handle text track list change
   *
   * @param {EventTarget~Event} event
   *        The `change` event that caused this function to be called.
   *
   * @listens TextTrackList#change
   */
  handleTracksChange(event) {
    this.selected(this.track.mode === 'showing');
  }

  handleSelectedLanguageChange(event) {
    if (this.track.mode === 'showing') {
      const selectedLanguage = this.player_.cache_.selectedLanguage;

      // Don't replace the kind of track across the same language
      if (selectedLanguage && selectedLanguage.enabled &&
        selectedLanguage.language === this.track.language &&
        selectedLanguage.kind !== this.track.kind) {
        return;
      }

      this.player_.cache_.selectedLanguage = {
        enabled: true,
        language: this.track.language,
        kind: this.track.kind
      };
    }
  }

  dispose() {
    // remove reference to track object on dispose
    this.track = null;

    super.dispose();
  }

}

Component.registerComponent('TextTrackMenuItem', TextTrackMenuItem);
export default TextTrackMenuItem;
