const strings = {
    auth: {
      login: "Login",
      register: "Register",
      password_label: "Password",
      login_submit: "Log in",
      login_submitting: "Logging in…",
      register_submitting: "Registering…",
      register_failed: "Registration failed"
    },

    header: {
        title: "Boela",
        home: "Home",
        history: "History",
        dashboard: "Admin panel",
        files: "Files",
        logout: "Logout",
        auth: "Auth",
        search: "Search",
    },

    search: {
      title: "Search benchmark results",
      problem_section: "Problem definition",
      algorithm_section: "Algorithm configuration",
      experiments_section: "Experiments",
      algorithm: "Algorithm",
      select_algorithm: "Select an algorithm",
      searching: "Searching…",
      search: "Search",
      result_id: "Result ID",
      best_f: "Best f",
      actions: "Actions",
      add: "Add",
      adding: "Adding…",
      added: "Added",
      no_results: "No results found",
      view_result: "View result",
      problem: "Problem set",
    },   
    
    footer: {
      home: "Home",
      search: "Search",
      history: "History",
      copyRight: "Copyright 2025",
    },
  
    home: {
      title: "Benchmark settings",
      algorithm: "Algorithm",
      seed: "Seed",
      submit: "Run experiments",
      submitting: "Running experiments…",
      cached_results_title: "These results already exist",
      cached_id: "ID:",
      expected_actual: "Expected / Actual:",
      best_result: "Best result:",
      view: "View",
      download_csv: "Download CSV",
      close: "Close",
      run_anyway: "Run anyway",
      methods_load_error: "Error loading methods",
      problem_section: "Problem definition",
      algorithm_section: "Algorithm configuration",
      experiments_section: "Experiments",
      add_experiment: "Add experiment",
      experiment_id: "Experiment ID",
      dimension: "Dimension",
      instance_id: "Instance ID",
      n_iter: "Number of iterations",
      select_algorithm: "Select an algorithm",
      none: "None",
      no_experiments: "No experiments added",
      multi_results_title: "Experiments submitted",
      parameters: "Parameters",
      actions: "Actions",
      delete_experiment: "Delete",
      fresh_section: "New runs",
      view_logs: "View logs",
      cached_section: "Cached runs",
      already_cached: "(cached)",
      best_f: "Best f",
      view_results: "View results",
      problem: "Problem",
      problem_suite: "Problem suite",
      select_problem_suite: "Select one or several problems",
      bbob: "Entire BBOB",
    },
    
  
    resultsHistory: {
      title: "Your Request History",
      loading: "Loading…",
      error: "Error loading history",
      table: {
        id: "Date",
        algorithm: "Algorithm",
        budget: "Budget",
        action: "Action",
        no_requests: "No requests"
      },
      details: "Details",
      prev: "← Back",
      next: "Next →",
      page: "Page"
    },
  
    submitResult: {
      job_id: "Optimization Job ID: ",
      not_specified: "not specified",
      container_logs: "Container Logs",
      back: "Back to Home",
      view_result: "View Result",
      waiting: "Waiting for completion…",
      log_error: "Failed to retrieve logs.",
      finished_message: "Container has finished execution"
    },
  
    resultDetails: {
      title: "Result Details",
      algorithm: "Algorithm",
      budget: "Budget",
      parameters: "Parameters",
      best_result: "Best Result",
      result_id: "Result ID: ",
      error_loading: "Error loading result.",
      request_error_prefix: "Request error: ",
      server_unsuccessful: "Server returned unsuccessful response",
      file_loading_error: "Error loading file",
      back: "Back to Home",
      spinner: "Loading…",
      formatted_view: "Formatted View",
      raw_view: "Show Raw JSON",
      download: "Download CSV",
      downloading: "Downloading…",
    },
  
    dashboard: {
      management_title: "Manage Algorithms",
      add_button: "Add Algorithm",
      delete_confirm: "Delete method?",
      spinner: "Loading…",
      table: {
        id: "ID",
        name: "Name",
        path: "Path",
        parameters: "Parameters",
        actions: "Actions",
        no_methods: "No methods"
      },
      modal: {
        title: "New Algorithm",
        method_name_label: "Method Name",
        files_label: "Algorithm Files",
        add_file: "+ Add File",
        parameters_label: "Parameters",
        add_parameter: "+ Add Parameter",
        cancel: "Cancel",
        submit: "Submit",
        enter_method_name: "Enter method name"
      },
      alerts: {
        deletion_error: "Error deleting: ",
        creation_error: "Error creating: "
      }
    },
  
    files: {
      title: "File Management",
      current_path: "Current path:",
      up: "Up",
      new_folder_placeholder: "New folder",
      create_folder: "Create Folder",
      uploading: "Uploading…",
      upload: "Upload",
      table: {
        name: "Name",
        type: "Type",
        actions: "Actions"
      },
      type: {
        folder: "Folder",
        file: "File"
      },
      download: "Download",
      delete: "Delete",
      empty: "Empty",
      loading: "Loading…",
      enter_folder_name: "Enter folder name",
      error_loading_list: "Error loading list: ",
      error_create_folder: "Failed to create folder: ",
      error_upload_file: "Error uploading file: ",
      error_download: "Error downloading: ",
      error_delete: "Error deleting: ",
      folder_emoji: "📁",
    },
  
    exit: {
      title: "Logout",
      message: "Logging out…"
    }
  };
  
  export default strings;
  